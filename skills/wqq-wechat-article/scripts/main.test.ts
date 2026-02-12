import { describe, expect, it } from "bun:test";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function buildEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
      continue;
    }
    env[key] = value;
  }

  return env;
}

async function runArticleCli(
  args: string[],
  cwd: string,
  envOverrides: Record<string, string | undefined> = {},
): Promise<RunResult> {
  const scriptPath = path.resolve(import.meta.dir, "main.ts");

  const proc = Bun.spawn(["bun", scriptPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: buildEnv(envOverrides),
  });

  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  return { code, stdout, stderr };
}

function extractOutdir(output: string): string {
  const match = output.match(/Created article structure in: (.+)/);
  if (!match?.[1]) {
    throw new Error(`Failed to parse output directory from: ${output}`);
  }
  return match[1].trim();
}

describe("wqq-wechat-article CLI", () => {
  it("generates dual-crop cover prompt file", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "wechat-article-test-"));
    const sourcesDir = path.join(workspace, "sources");
    await mkdir(sourcesDir, { recursive: true });

    const sourceFile = path.join(sourcesDir, "01-source-demo.md");
    await writeFile(
      sourceFile,
      [
        "---",
        "title: Demo Source",
        "url: https://example.com/demo",
        "---",
        "",
        "Demo content.",
      ].join("\n"),
      "utf8",
    );

    const requestedOutdir = path.join(workspace, "article-output");
    const result = await runArticleCli(
      [
        "--sources",
        sourceFile,
        "--summary",
        "公众号封面双裁切规范",
        "--outdir",
        requestedOutdir,
      ],
      workspace,
    );

    expect(result.code).toBe(0);

    const allOutput = `${result.stdout}\n${result.stderr}`;
    const actualOutdir = extractOutdir(allOutput);
    const coverPromptPath = path.join(
      actualOutdir,
      "04-infographics",
      "00-cover-prompt.md",
    );
    const coverPrompt = await readFile(coverPromptPath, "utf8");

    expect(coverPrompt).toContain("2.35:1");
    expect(coverPrompt).toContain("1:1");
    expect(coverPrompt).toContain("42.55%");
  });

  it("skips past articles when env is not configured", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "wechat-article-test-"));
    const sourcesDir = path.join(workspace, "sources");
    await mkdir(sourcesDir, { recursive: true });

    const sourceFile = path.join(sourcesDir, "01-source-demo.md");
    await writeFile(
      sourceFile,
      [
        "---",
        "title: Demo Source",
        "url: https://example.com/demo",
        "---",
        "",
        "Demo content.",
      ].join("\n"),
      "utf8",
    );

    const requestedOutdir = path.join(workspace, "article-output");
    const result = await runArticleCli(
      [
        "--sources",
        sourceFile,
        "--summary",
        "未配置历史文章目录",
        "--outdir",
        requestedOutdir,
      ],
      workspace,
      { WQQ_PAST_ARTICLES_DIR: undefined },
    );

    expect(result.code).toBe(0);
    const allOutput = `${result.stdout}\n${result.stderr}`;
    expect(allOutput).toContain("Past articles directory: skipped");
  });

  it("loads past articles directory from ~/.wqq-skills/.env", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "wechat-article-test-"));
    const fakeHome = await mkdtemp(path.join(tmpdir(), "wechat-article-home-"));

    const sourcesDir = path.join(workspace, "sources");
    await mkdir(sourcesDir, { recursive: true });

    const sourceFile = path.join(sourcesDir, "01-source-demo.md");
    await writeFile(
      sourceFile,
      [
        "---",
        "title: Demo Source",
        "url: https://example.com/demo",
        "---",
        "",
        "Demo content.",
      ].join("\n"),
      "utf8",
    );

    const pastArticlesDir = path.join(fakeHome, "private-past-articles");
    await mkdir(pastArticlesDir, { recursive: true });

    const envDir = path.join(fakeHome, ".wqq-skills");
    await mkdir(envDir, { recursive: true });
    await writeFile(
      path.join(envDir, ".env"),
      `WQQ_PAST_ARTICLES_DIR=${pastArticlesDir}\n`,
      "utf8",
    );

    const requestedOutdir = path.join(workspace, "article-output");
    const result = await runArticleCli(
      [
        "--sources",
        sourceFile,
        "--summary",
        "从env读取历史文章目录",
        "--outdir",
        requestedOutdir,
      ],
      workspace,
      {
        HOME: fakeHome,
        WQQ_PAST_ARTICLES_DIR: undefined,
      },
    );

    expect(result.code).toBe(0);
    const allOutput = `${result.stdout}\n${result.stderr}`;
    expect(allOutput).toContain(
      `Past articles directory: ${path.resolve(pastArticlesDir)}`,
    );
  });
});
