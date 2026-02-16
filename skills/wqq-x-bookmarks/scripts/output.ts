import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

function sanitizePathSegment(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 48);
}

function extractFrontMatterField(markdown: string, key: string): string | null {
  const frontMatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch?.[1]) {
    return null;
  }
  const fieldMatch = frontMatterMatch[1].match(new RegExp(`^${key}:\\s*\"([^\"]+)\"$`, "m"));
  return fieldMatch?.[1]?.trim() || null;
}

function extractPreviewText(markdown: string): string {
  const withoutFrontMatter = markdown.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const h1Match = withoutFrontMatter.match(/^#\s+(.+)$/m);
  if (h1Match?.[1]?.trim()) {
    return h1Match[1].trim();
  }

  const lines = withoutFrontMatter.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    return trimmed;
  }

  return "";
}

export function buildTweetOutputDirName(tweetId: string, markdown: string): string {
  const preview = sanitizePathSegment(extractPreviewText(markdown));
  const author = sanitizePathSegment(extractFrontMatterField(markdown, "authorUsername") || "tweet");
  return [preview, author, tweetId].filter(Boolean).join("-");
}

export function resolveTweetOutputPath(baseDir: string, dirName: string, tweetId: string): string {
  return path.join(baseDir, dirName, `${tweetId}.md`);
}

export function findExistingTweetMarkdownPath(baseDir: string, tweetId: string): string | null {
  const legacyPath = path.join(baseDir, tweetId, `${tweetId}.md`);
  if (existsSync(legacyPath)) {
    return legacyPath;
  }

  if (!existsSync(baseDir)) {
    return null;
  }

  for (const dirent of readdirSync(baseDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) {
      continue;
    }
    const candidate = path.join(baseDir, dirent.name, `${tweetId}.md`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function shouldSkipTweetOutput(_markdownPath: string, exists: boolean): boolean {
  return exists;
}
