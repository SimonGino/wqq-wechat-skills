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
  test("renders list from entries", () => {
    const markdown = renderBookmarkSummaryMarkdown([
      {
        tweetId: "1",
        title: "A title",
        authorUsername: "alice",
        url: "https://x.com/alice/status/1",
        excerpt: "One line summary",
        relativePath: "20260110-100000-a-alice-1/1.md",
      },
    ]);

    expect(markdown).toContain("# X Bookmarks Summary");
    expect(markdown).toContain("A title");
    expect(markdown).toContain("One line summary");
    expect(markdown).toContain("20260110-100000-a-alice-1/1.md");
  });
});
