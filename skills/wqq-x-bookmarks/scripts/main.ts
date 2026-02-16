import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasRequiredXCookies, loadXCookies } from "../../shared/x-runtime/cookies";
import { fetchBookmarksPage } from "./bookmarks-api";
import { extractBookmarkPageDetails } from "./bookmarks-parser";
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "./output";
import { fetchTweetResultByRestId, shouldHydrateTweet } from "./tweet-detail";
import type { BookmarkTweet, ExportArgs, ExportSummary } from "./types";

function parsePositiveInt(input: string, flagName: string): number {
  const value = Number.parseInt(input, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return value;
}

function printUsage(): void {
  console.log("Usage:");
  console.log("  npx -y bun skills/wqq-x-bookmarks/scripts/main.ts [--limit <n>] [--output <dir>] [--no-download-media]");
}

export function parseExportArgs(argv: string[]): ExportArgs {
  const args: ExportArgs = {
    limit: 50,
    outputDir: path.resolve(process.cwd(), "wqq-x-bookmarks-output"),
    downloadMedia: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--limit") {
      const value = argv[++i];
      if (!value) {
        throw new Error("Missing value for --limit");
      }
      args.limit = parsePositiveInt(value, "--limit");
      continue;
    }

    if (arg === "--output") {
      const value = argv[++i];
      if (!value) {
        throw new Error("Missing value for --output");
      }
      args.outputDir = path.resolve(value);
      continue;
    }

    if (arg === "--no-download-media") {
      args.downloadMedia = false;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return args;
}

function normalizeTweetText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function toTitle(text: string, fallback: string): string {
  const lines = normalizeTweetText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = lines[0];
  if (!firstLine) {
    return fallback;
  }
  return firstLine.length > 80 ? `${firstLine.slice(0, 80)}...` : firstLine;
}

function renderTweetMarkdown(tweet: BookmarkTweet): string {
  const title = toTitle(tweet.text, tweet.url);
  const body = normalizeTweetText(tweet.text) || tweet.url;

  const lines: string[] = [
    "---",
    `url: ${JSON.stringify(tweet.url)}`,
    `authorUsername: ${JSON.stringify(tweet.username ?? "tweet")}`,
    `tweetId: ${JSON.stringify(tweet.id)}`,
    "---",
    "",
    `# ${title}`,
    "",
    body,
  ];

  if (tweet.mediaUrls.length > 0) {
    lines.push("", "## Media", "");
    for (const mediaUrl of tweet.mediaUrls) {
      const ext = path.extname(new URL(mediaUrl).pathname).toLowerCase();
      if (ext === ".mp4" || ext === ".mov" || ext === ".m3u8") {
        lines.push(`[Video](${mediaUrl})`);
      } else {
        lines.push(`![Image](${mediaUrl})`);
      }
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function guessFileNameFromUrl(url: string, index: number): { subDir: string; fileName: string } {
  const parsed = new URL(url);
  const ext = path.extname(parsed.pathname).toLowerCase();
  const isVideo = ext === ".mp4" || ext === ".mov" || ext === ".m3u8";
  const subDir = isVideo ? "videos" : "imgs";
  const fallbackExt = isVideo ? ".mp4" : ".jpg";
  const fileName = `${String(index + 1).padStart(2, "0")}${ext || fallbackExt}`;
  return { subDir, fileName };
}

async function localizeMarkdownMedia(
  markdown: string,
  markdownPath: string,
  log: (message: string) => void
): Promise<string> {
  const mediaPattern = /(\!?\[[^\]]*\])\((https?:\/\/[^\s)]+)\)/g;
  const matches = [...markdown.matchAll(mediaPattern)];
  if (matches.length === 0) {
    return markdown;
  }

  let updated = markdown;
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    if (!match || !match[2]) {
      continue;
    }
    const mediaUrl = match[2];

    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) {
        log(`[bookmarks-export] media download failed (${response.status}): ${mediaUrl}`);
        continue;
      }

      const { subDir, fileName } = guessFileNameFromUrl(mediaUrl, i);
      const mediaDir = path.join(path.dirname(markdownPath), subDir);
      const localPath = path.join(mediaDir, fileName);
      await mkdir(mediaDir, { recursive: true });
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(localPath, buffer);

      const relativePath = path.relative(path.dirname(markdownPath), localPath).split(path.sep).join("/");
      updated = updated.replaceAll(mediaUrl, relativePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`[bookmarks-export] media download error: ${mediaUrl} (${message})`);
    }
  }

  return updated;
}

async function collectBookmarkTweets(
  cookieMap: Record<string, string>,
  limit: number,
  log: (message: string) => void
): Promise<{ tweetIds: string[]; tweetsById: Record<string, BookmarkTweet> }> {
  const tweetIds: string[] = [];
  const tweetsById: Record<string, BookmarkTweet> = {};
  const seenIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  while (tweetIds.length < limit) {
    const count = Math.min(50, limit - tweetIds.length);
    const payload = await fetchBookmarksPage({ cookieMap, count, cursor });
    const page = extractBookmarkPageDetails(payload);

    for (const [tweetId, tweet] of Object.entries(page.tweetsById)) {
      if (!tweetsById[tweetId]) {
        tweetsById[tweetId] = tweet;
      }
    }

    for (const tweetId of page.tweetIds) {
      if (seenIds.has(tweetId)) {
        continue;
      }
      seenIds.add(tweetId);
      tweetIds.push(tweetId);
      if (tweetIds.length >= limit) {
        break;
      }
    }

    if (!page.nextCursor || seenCursors.has(page.nextCursor)) {
      break;
    }

    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
    log(`[bookmarks-export] next cursor: ${cursor}`);
  }

  return { tweetIds, tweetsById };
}

function buildFallbackTweet(tweetId: string): BookmarkTweet {
  const url = `https://x.com/i/web/status/${tweetId}`;
  return {
    id: tweetId,
    text: url,
    username: "tweet",
    url,
    mediaUrls: [],
  };
}

function mergeTweetData(base: BookmarkTweet, detail: BookmarkTweet | null): BookmarkTweet {
  if (!detail) {
    return base;
  }

  return {
    id: base.id,
    username: detail.username || base.username,
    text: detail.text || base.text,
    url: detail.url || base.url,
    mediaUrls: detail.mediaUrls.length > 0 ? detail.mediaUrls : base.mediaUrls,
  };
}

async function hydrateTweetIfNeeded(
  tweetId: string,
  tweet: BookmarkTweet,
  cookieMap: Record<string, string>,
  log: (message: string) => void
): Promise<BookmarkTweet> {
  if (!shouldHydrateTweet(tweet)) {
    return tweet;
  }

  try {
    const detail = await fetchTweetResultByRestId({ tweetId, cookieMap });
    const merged = mergeTweetData(tweet, detail);
    if (!shouldHydrateTweet(merged)) {
      log(`[bookmarks-export] hydrated: ${tweetId}`);
    } else {
      log(`[bookmarks-export] hydrate incomplete: ${tweetId}`);
    }
    return merged;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`[bookmarks-export] hydrate failed: ${tweetId} (${message})`);
    return tweet;
  }
}

async function exportSingleTweet(
  tweetId: string,
  tweet: BookmarkTweet,
  args: ExportArgs,
  log: (message: string) => void
): Promise<"success" | "skipped" | "failed"> {
  const existingPath = findExistingTweetMarkdownPath(args.outputDir, tweetId);
  if (shouldSkipTweetOutput(existingPath ?? "", Boolean(existingPath))) {
    log(`[bookmarks-export] skipped: ${tweetId} (exists: ${existingPath})`);
    return "skipped";
  }

  try {
    let markdown = renderTweetMarkdown(tweet);
    const dirName = buildTweetOutputDirName(tweetId, markdown);
    const markdownPath = resolveTweetOutputPath(args.outputDir, dirName, tweetId);
    await mkdir(path.dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, markdown, "utf8");

    if (args.downloadMedia) {
      markdown = await localizeMarkdownMedia(markdown, markdownPath, log);
      await writeFile(markdownPath, markdown, "utf8");
    }

    log(`[bookmarks-export] success: ${tweetId} -> ${markdownPath}`);
    return "success";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`[bookmarks-export] failed: ${tweetId} (${message})`);
    return "failed";
  }
}

export async function runBookmarksExport(argv: string[]): Promise<ExportSummary> {
  const args = parseExportArgs(argv);
  const log = console.log;

  log("[bookmarks-export] loading cookies");
  const cookieMap = await loadXCookies(log);
  if (!hasRequiredXCookies(cookieMap)) {
    throw new Error("Missing auth cookies. Provide X_AUTH_TOKEN and X_CT0.");
  }

  log(`[bookmarks-export] collecting latest ${args.limit} bookmarks`);
  const collected = await collectBookmarkTweets(cookieMap, args.limit, log);
  log(`[bookmarks-export] collected ${collected.tweetIds.length} tweet ids`);

  const summary: ExportSummary = { success: 0, skipped: 0, failed: 0 };
  for (const tweetId of collected.tweetIds) {
    const baseTweet = collected.tweetsById[tweetId] ?? buildFallbackTweet(tweetId);
    const tweet = await hydrateTweetIfNeeded(tweetId, baseTweet, cookieMap, log);
    const result = await exportSingleTweet(tweetId, tweet, args, log);
    summary[result] += 1;
  }

  log(
    `[bookmarks-export] done. success=${summary.success}, skipped=${summary.skipped}, failed=${summary.failed}, output=${args.outputDir}`
  );

  return summary;
}

const isCliExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCliExecution) {
  runBookmarksExport(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
