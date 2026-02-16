import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasRequiredXCookies, loadXCookies } from "../../shared/x-runtime/cookies";
import { localizeMarkdownMedia } from "../../shared/x-runtime/media-localizer";
import { tweetToMarkdown } from "../../shared/x-runtime/tweet-to-markdown";
import { fetchBookmarksPage } from "./bookmarks-api";
import { extractBookmarkPageDetails } from "./bookmarks-parser";
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "./output";
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

function toCookieRecord(cookieMap: Record<string, string | undefined>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(cookieMap)) {
    if (typeof value === "string" && value.trim()) {
      output[key] = value;
    }
  }
  return output;
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

function resolveTweetSeedUrl(tweetId: string, tweet: BookmarkTweet | undefined): string {
  const candidate = tweet?.url?.trim();
  if (candidate && /^https?:\/\//i.test(candidate)) {
    return candidate;
  }
  return `https://x.com/i/web/status/${tweetId}`;
}

async function exportSingleTweet(
  tweetId: string,
  tweetUrl: string,
  cookieMap: Record<string, string>,
  args: ExportArgs,
  log: (message: string) => void
): Promise<"success" | "skipped" | "failed"> {
  const existingPath = findExistingTweetMarkdownPath(args.outputDir, tweetId);
  if (shouldSkipTweetOutput(existingPath ?? "", Boolean(existingPath))) {
    log(`[bookmarks-export] skipped: ${tweetId} (exists: ${existingPath})`);
    return "skipped";
  }

  try {
    let markdown = await tweetToMarkdown(tweetUrl, { log, cookieMap });
    const dirName = buildTweetOutputDirName(tweetId, markdown);
    const markdownPath = resolveTweetOutputPath(args.outputDir, dirName, tweetId);

    await mkdir(path.dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, markdown, "utf8");

    if (args.downloadMedia) {
      const localized = await localizeMarkdownMedia(markdown, {
        markdownPath,
        log,
      });
      if (localized.markdown !== markdown) {
        markdown = localized.markdown;
        await writeFile(markdownPath, markdown, "utf8");
      }
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
  const rawCookieMap = await loadXCookies(log);
  if (!hasRequiredXCookies(rawCookieMap)) {
    throw new Error("Missing auth cookies. Provide X_AUTH_TOKEN and X_CT0.");
  }
  const cookieMap = toCookieRecord(rawCookieMap);

  log(`[bookmarks-export] collecting latest ${args.limit} bookmarks`);
  const collected = await collectBookmarkTweets(cookieMap, args.limit, log);
  log(`[bookmarks-export] collected ${collected.tweetIds.length} tweet ids`);

  const summary: ExportSummary = { success: 0, skipped: 0, failed: 0 };

  for (const tweetId of collected.tweetIds) {
    const tweetUrl = resolveTweetSeedUrl(tweetId, collected.tweetsById[tweetId]);
    const result = await exportSingleTweet(tweetId, tweetUrl, cookieMap, args, log);
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
