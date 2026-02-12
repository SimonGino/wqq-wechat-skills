import { describe, expect, it } from "bun:test";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type RunResult = {
  code: number;
  stdout: string;
  stderr: string;
};

async function runArticleCli(args: string[], cwd: string): Promise<RunResult> {
  const scriptPath = path.resolve(import.meta.dir, "main.ts");

  const proc = Bun.spawn(["bun", scriptPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
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
});
