import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type BookmarkSummarySource = {
  tweetId: string;
  markdownPath: string;
};

export type BookmarkSummaryEntry = {
  tweetId: string;
  title: string;
  authorUsername: string;
  url: string;
  excerpt: string;
  relativePath: string;
};

function extractFrontMatter(markdown: string): string {
  return markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
}

function extractFrontMatterField(frontMatter: string, key: string): string | null {
  const quotedMatch = frontMatter.match(new RegExp(`^${key}:\\s*\"([^\"]*)\"$`, "m"));
  if (quotedMatch?.[1] !== undefined) {
    return quotedMatch[1].trim();
  }

  const plainMatch = frontMatter.match(new RegExp(`^${key}:\\s*([^\\n]+)$`, "m"));
  if (plainMatch?.[1] !== undefined) {
    return plainMatch[1].trim();
  }

  return null;
}

function extractBody(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function extractTitle(tweetId: string, body: string): string {
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return title || `Tweet ${tweetId}`;
}

function extractExcerpt(body: string): string {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    if (/^https?:\/\/\S+$/i.test(line)) continue;
    return line.length > 160 ? `${line.slice(0, 160)}...` : line;
  }
  return "";
}

export function parseBookmarkMarkdown(tweetId: string, markdown: string): Omit<BookmarkSummaryEntry, "relativePath"> {
  const frontMatter = extractFrontMatter(markdown);
  const body = extractBody(markdown);
  return {
    tweetId,
    title: extractTitle(tweetId, body),
    authorUsername: extractFrontMatterField(frontMatter, "authorUsername") || "tweet",
    url: extractFrontMatterField(frontMatter, "url") || `https://x.com/i/web/status/${tweetId}`,
    excerpt: extractExcerpt(body),
  };
}

export function renderBookmarkSummaryMarkdown(entries: BookmarkSummaryEntry[]): string {
  const lines: string[] = [
    "# X Bookmarks Summary",
    "",
    `GeneratedAt: ${new Date().toISOString()}`,
    `Total: ${entries.length}`,
    "",
    "## Items",
    "",
  ];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    lines.push(`${i + 1}. [${entry.title}](${entry.relativePath})`);
    lines.push(`TweetId: \`${entry.tweetId}\` | Author: @${entry.authorUsername}`);
    lines.push(`URL: ${entry.url}`);
    lines.push(`Summary: ${entry.excerpt || "(empty)"}`);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeBookmarkSummary(
  outputDir: string,
  sources: BookmarkSummarySource[],
  log?: (message: string) => void
): Promise<string | null> {
  if (sources.length === 0) {
    return null;
  }

  const entries: BookmarkSummaryEntry[] = [];
  for (const source of sources) {
    try {
      const markdown = await readFile(source.markdownPath, "utf8");
      const parsed = parseBookmarkMarkdown(source.tweetId, markdown);
      entries.push({
        ...parsed,
        relativePath: path.relative(outputDir, source.markdownPath).split(path.sep).join("/"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log?.(`[bookmarks-export] summary skipped: ${source.tweetId} (${message})`);
    }
  }

  if (entries.length === 0) {
    return null;
  }

  const summaryPath = path.join(outputDir, "SUMMARY.md");
  const summaryMarkdown = renderBookmarkSummaryMarkdown(entries);
  await writeFile(summaryPath, summaryMarkdown, "utf8");
  return summaryPath;
}
