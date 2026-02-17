import { describe, expect, test } from "bun:test";
import { parseBookmarkMarkdown, renderBookmarkSummaryMarkdown } from "./summary";

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
