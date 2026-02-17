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
  oneLineSummary: string;
  relevanceReason: string;
  relativePath: string;
};

export type ParsedBookmarkSummary = {
  tweetId: string;
  title: string;
  authorUsername: string;
  url: string;
  excerpt: string;
};

type AiSummaryResult = {
  oneLineSummary: string;
  relevanceReason: string;
  usedFallback: boolean;
};

const FALLBACK_RELEVANCE_REASON = "与技术实践相关，建议按需阅读原文。";

function buildFallbackSummary(fallbackExcerpt: string): AiSummaryResult {
  return {
    oneLineSummary: fallbackExcerpt || "(empty)",
    relevanceReason: FALLBACK_RELEVANCE_REASON,
    usedFallback: true,
  };
}

function parseAiSummaryContent(content: string): Omit<AiSummaryResult, "usedFallback"> | null {
  const oneLineSummary = content.match(/(?:^|\n)一句话摘要[:：]\s*(.+)/)?.[1]?.trim() || "";
  const relevanceReason = content.match(/(?:^|\n)相关性说明[:：]\s*(.+)/)?.[1]?.trim() || "";
  if (!oneLineSummary || !relevanceReason) {
    return null;
  }

  return {
    oneLineSummary,
    relevanceReason,
  };
}

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

export function parseBookmarkMarkdown(tweetId: string, markdown: string): ParsedBookmarkSummary {
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

export async function generateAiSummaryForBookmark(input: {
  markdown: string;
  fallbackExcerpt: string;
  url: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
}): Promise<AiSummaryResult> {
  const fallback = buildFallbackSummary(input.fallbackExcerpt);
  const env = input.env || process.env;
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return fallback;
  }

  const fetchImpl = input.fetchImpl || fetch;
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You summarize X bookmarks for Chinese readers. Reply in exactly two lines with labels: 一句话摘要：... and 相关性说明：...",
          },
          {
            role: "user",
            content: `请总结下面内容并只输出两行：\n一句话摘要：...\n相关性说明：...\n\n${input.markdown}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseAiSummaryContent(content);
    if (!parsed) {
      throw new Error("OpenAI response format is invalid");
    }

    return {
      ...parsed,
      usedFallback: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.log?.(`[bookmarks-export] ai summary fallback: ${input.url} (${message})`);
    return fallback;
  }
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
    lines.push(`一句话摘要：${entry.oneLineSummary || "(empty)"}`);
    lines.push(`相关性说明：${entry.relevanceReason || "(empty)"}`);
    lines.push(`来源链接：[原帖](${entry.url})`);
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
        tweetId: parsed.tweetId,
        title: parsed.title,
        authorUsername: parsed.authorUsername,
        url: parsed.url,
        oneLineSummary: parsed.excerpt,
        relevanceReason: FALLBACK_RELEVANCE_REASON,
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
