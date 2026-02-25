import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hasRequiredXCookies, loadXCookies } from "../../shared/x-runtime/cookies";
import { localizeMarkdownMedia } from "../../shared/x-runtime/media-localizer";
import { tweetToMarkdown } from "../../shared/x-runtime/tweet-to-markdown";
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "../../wqq-x-bookmarks/scripts/output";
import { translateMarkdownToChinese } from "./translate";
import type { ExportArgs, ExportSummary } from "./types";

type RuntimeDeps = {
  loadCookies: typeof loadXCookies;
  tweetToMarkdownImpl: typeof tweetToMarkdown;
  localizeMarkdownMediaImpl: typeof localizeMarkdownMedia;
  translateMarkdownToChineseImpl: typeof translateMarkdownToChinese;
};

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  npx -y bun skills/wqq-x-urls-zh-md/scripts/main.ts --urls <url1> <url2> ... [--output <dir>] [--no-download-media]",
  );
}

export function parseExportArgs(argv: string[]): ExportArgs {
  const args: ExportArgs = {
    urls: [],
    outputDir: path.resolve(process.cwd(), "wqq-x-urls-zh-md-output"),
    downloadMedia: true,
  };

  const takeMany = (i: number): { items: string[]; next: number } => {
    const items: string[] = [];
    let j = i + 1;
    while (j < argv.length) {
      const value = argv[j];
      if (!value || value.startsWith("-")) break;
      items.push(value);
      j++;
    }
    return { items, next: j - 1 };
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg) continue;

    if (arg === "--urls") {
      const { items, next } = takeMany(i);
      if (items.length === 0) throw new Error("Missing values for --urls");
      args.urls.push(...items);
      i = next;
      continue;
    }

    if (arg === "--output") {
      const value = argv[++i];
      if (!value) throw new Error("Missing value for --output");
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

  if (args.urls.length === 0) {
    throw new Error("--urls is required");
  }

  return args;
}

function parseTweetIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/status(?:es)?\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function toCookieRecord(cookieMap: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(cookieMap)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value;
    }
  }
  return out;
}

async function exportSingleUrl(
  url: string,
  cookieMap: Record<string, string>,
  args: ExportArgs,
  deps: RuntimeDeps,
  log: (message: string) => void,
): Promise<"success" | "skipped" | "failed"> {
  const tweetId = parseTweetIdFromUrl(url);
  if (!tweetId) {
    log(`[x-urls-zh-md] failed: invalid tweet url (${url})`);
    return "failed";
  }

  const existingPath = findExistingTweetMarkdownPath(args.outputDir, tweetId);
  if (shouldSkipTweetOutput(existingPath ?? "", Boolean(existingPath))) {
    log(`[x-urls-zh-md] skipped: ${tweetId} (exists: ${existingPath})`);
    return "skipped";
  }

  try {
    let markdown = await deps.tweetToMarkdownImpl(url, { log, cookieMap });
    markdown = await deps.translateMarkdownToChineseImpl(markdown, { log });

    const dirName = buildTweetOutputDirName(tweetId, markdown);
    const markdownPath = resolveTweetOutputPath(args.outputDir, dirName, tweetId);
    await mkdir(path.dirname(markdownPath), { recursive: true });

    if (args.downloadMedia) {
      const localized = await deps.localizeMarkdownMediaImpl(markdown, {
        markdownPath,
        log,
      });
      markdown = localized.markdown;
    }

    await writeFile(markdownPath, markdown, "utf8");
    log(`[x-urls-zh-md] success: ${tweetId} -> ${markdownPath}`);
    return "success";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`[x-urls-zh-md] failed: ${tweetId} (${message})`);
    return "failed";
  }
}

export async function runXUrlsZhExport(
  argv: string[],
  overrides: Partial<RuntimeDeps> = {},
): Promise<ExportSummary> {
  const args = parseExportArgs(argv);
  const log = console.log;

  const deps: RuntimeDeps = {
    loadCookies: overrides.loadCookies ?? loadXCookies,
    tweetToMarkdownImpl: overrides.tweetToMarkdownImpl ?? tweetToMarkdown,
    localizeMarkdownMediaImpl:
      overrides.localizeMarkdownMediaImpl ?? localizeMarkdownMedia,
    translateMarkdownToChineseImpl:
      overrides.translateMarkdownToChineseImpl ?? translateMarkdownToChinese,
  };

  log("[x-urls-zh-md] loading cookies");
  const rawCookies = await deps.loadCookies(log);
  if (!hasRequiredXCookies(rawCookies)) {
    throw new Error("Missing auth cookies. Provide X_AUTH_TOKEN and X_CT0.");
  }
  const cookieMap = toCookieRecord(rawCookies);

  const summary: ExportSummary = { success: 0, skipped: 0, failed: 0 };

  for (const url of args.urls) {
    const status = await exportSingleUrl(url, cookieMap, args, deps, log);
    summary[status] += 1;
  }

  log(
    `[x-urls-zh-md] done. success=${summary.success}, skipped=${summary.skipped}, failed=${summary.failed}, output=${args.outputDir}`,
  );
  return summary;
}

const isCliExecution =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCliExecution) {
  runXUrlsZhExport(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
