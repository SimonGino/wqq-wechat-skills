import { describe, expect, test } from "bun:test";
import { isLikelyEnglishMarkdown, translateMarkdownToChinese } from "./translate";

describe("isLikelyEnglishMarkdown", () => {
  test("detects mostly English markdown content", () => {
    const markdown = `---
url: "https://x.com/alice/status/1"
---

# Hello World

This is an English thread summary with practical setup notes and troubleshooting steps.
`;

    expect(isLikelyEnglishMarkdown(markdown)).toBe(true);
  });

  test("skips Chinese markdown content", () => {
    const markdown = `---
url: "https://x.com/alice/status/1"
---

# 中文标题

这是一段中文内容，主要介绍配置步骤和排错方法。
`;

    expect(isLikelyEnglishMarkdown(markdown)).toBe(false);
  });
});

describe("translateMarkdownToChinese", () => {
  test("returns original markdown when content is not English", async () => {
    let calls = 0;
    const markdown = `# 中文内容\n\n这是一段中文说明。`;

    const output = await translateMarkdownToChinese(markdown, {
      translateBodyImpl: async (body) => {
        calls += 1;
        return body;
      },
      env: { OPENAI_API_KEY: "unused" } as NodeJS.ProcessEnv,
    });

    expect(output).toBe(markdown);
    expect(calls).toBe(0);
  });

  test("preserves frontmatter and code fences while translating body text", async () => {
    const markdown = `---
url: "https://x.com/alice/status/1"
authorUsername: "alice"
coverImage: "https://pbs.twimg.com/media/demo.jpg"
---

# Hello world

Use \`bun test\` before deploy.

\`\`\`bash
echo "do not translate"
\`\`\`

![cover](imgs/img-001-demo.jpg)
`;

    const output = await translateMarkdownToChinese(markdown, {
      translateBodyImpl: async (body) =>
        body
          .replace("Hello world", "你好，世界")
          .replace("Use ", "请使用 ")
          .replace(" before deploy.", " 后再部署。"),
      env: { OPENAI_API_KEY: "test-key" } as NodeJS.ProcessEnv,
    });

    expect(output).toContain('url: "https://x.com/alice/status/1"');
    expect(output).toContain('coverImage: "https://pbs.twimg.com/media/demo.jpg"');
    expect(output).toContain("# 你好，世界");
    expect(output).toContain("请使用 `bun test` 后再部署。");
    expect(output).toContain('echo "do not translate"');
    expect(output).toContain("![cover](imgs/img-001-demo.jpg)");
  });
});
