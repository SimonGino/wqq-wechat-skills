import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  generateAiSummaryForBookmark,
  parseBookmarkMarkdown,
  renderBookmarkSummaryMarkdown,
  writeBookmarkSummary,
} from "./summary";

describe("parseBookmarkMarkdown", () => {
  test("extracts summary fields from bookmark markdown", () => {
    const markdown = `---
url: "https://x.com/eyad_khrais/status/2010076957938188661"
authorUsername: "eyad_khrais"
tweetId: "2010076957938188661"
---

# The complete claude code tutorial

I have used Claude Code for years and this is my playbook.
`;

    const entry = parseBookmarkMarkdown("2010076957938188661", markdown);
    expect(entry.title).toBe("The complete claude code tutorial");
    expect(entry.authorUsername).toBe("eyad_khrais");
    expect(entry.url).toContain("/status/2010076957938188661");
    expect(entry.excerpt).toContain("playbook");
  });
});

describe("renderBookmarkSummaryMarkdown", () => {
  test("renders three-part summary format", () => {
    const markdown = renderBookmarkSummaryMarkdown([
      {
        tweetId: "1",
        title: "A title",
        authorUsername: "alice",
        url: "https://x.com/alice/status/1",
        oneLineSummary: "这是一句话摘要",
        relevanceReason: "它解释了工程实践中的关键取舍",
        relativePath: "20260110-100000-a-alice-1/1.md",
      },
    ]);

    expect(markdown).toContain("一句话摘要：这是一句话摘要");
    expect(markdown).toContain("相关性说明：它解释了工程实践中的关键取舍");
    expect(markdown).toContain("来源链接：[原帖](https://x.com/alice/status/1)");
  });
});

describe("generateAiSummaryForBookmark", () => {
  test("throws when OPENAI_API_KEY is missing", async () => {
    let capturedError: unknown;
    try {
      await generateAiSummaryForBookmark({
        markdown: "# Title\n\nBody",
        fallbackExcerpt: "Fallback excerpt",
        url: "https://x.com/a/status/1",
        env: {} as NodeJS.ProcessEnv,
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(Error);
    expect((capturedError as Error).message).toContain("OPENAI_API_KEY");
  });

  test("returns structured summary from OpenAI response", async () => {
    const fakeFetch = async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "一句话摘要：这是测试摘要\n相关性说明：这条内容与工程实践直接相关",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );

    const result = await generateAiSummaryForBookmark({
      markdown: "# Title\n\nBody",
      fallbackExcerpt: "Fallback excerpt",
      url: "https://x.com/a/status/1",
      fetchImpl: fakeFetch as unknown as typeof fetch,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
      } as NodeJS.ProcessEnv,
    });

    expect(result.oneLineSummary).toContain("测试摘要");
    expect(result.relevanceReason).toContain("工程实践");
    expect(result.usedFallback).toBe(false);
  });

  test("falls back when OpenAI request fails", async () => {
    const fakeFetch = async () => {
      throw new Error("network");
    };

    const result = await generateAiSummaryForBookmark({
      markdown: "# Title\n\nBody",
      fallbackExcerpt: "Fallback excerpt",
      url: "https://x.com/a/status/1",
      fetchImpl: fakeFetch as unknown as typeof fetch,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "https://api.openai.com/v1",
      } as NodeJS.ProcessEnv,
    });

    expect(result.oneLineSummary).toBe("Fallback excerpt");
    expect(result.relevanceReason).toContain("技术实践相关");
    expect(result.usedFallback).toBe(true);
  });
});

describe("writeBookmarkSummary", () => {
  test("throws when OPENAI_API_KEY is missing", async () => {
    const out = await mkdtemp(path.join(tmpdir(), "x-bookmarks-"));
    const itemDir = path.join(out, "20260110-100000-a-alice-1");
    await mkdir(itemDir, { recursive: true });
    await Bun.write(
      path.join(itemDir, "1.md"),
      `---
url: "https://x.com/alice/status/1"
authorUsername: "alice"
---

# Title
Body`
    );

    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await expect(
        writeBookmarkSummary(out, [{ tweetId: "1", markdownPath: path.join(itemDir, "1.md") }])
      ).rejects.toThrow("OPENAI_API_KEY");
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    }
  });

  test("uses ai summary when OPENAI_API_KEY is configured", async () => {
    const out = await mkdtemp(path.join(tmpdir(), "x-bookmarks-"));
    const itemDir = path.join(out, "20260110-100000-a-alice-1");
    await mkdir(itemDir, { recursive: true });
    await Bun.write(
      path.join(itemDir, "1.md"),
      `---
url: "https://x.com/alice/status/1"
authorUsername: "alice"
---

# Title
Body`
    );

    const originalFetch = globalThis.fetch;
    const originalApiKey = process.env.OPENAI_API_KEY;
    const originalBaseUrl = process.env.OPENAI_BASE_URL;

    globalThis.fetch = ((async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "一句话摘要：AI 摘要\n相关性说明：AI 相关性",
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as unknown) as typeof fetch;
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_BASE_URL = "https://api.openai.com/v1";

    try {
      const summaryPath = await writeBookmarkSummary(out, [{ tweetId: "1", markdownPath: path.join(itemDir, "1.md") }]);
      const text = await readFile(summaryPath!, "utf8");

      expect(text).toContain("一句话摘要：AI 摘要");
      expect(text).toContain("相关性说明：AI 相关性");
    } finally {
      globalThis.fetch = originalFetch;
      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }

      if (originalBaseUrl === undefined) {
        delete process.env.OPENAI_BASE_URL;
      } else {
        process.env.OPENAI_BASE_URL = originalBaseUrl;
      }
    }
  });
});
