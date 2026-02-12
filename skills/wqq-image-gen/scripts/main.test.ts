import { describe, expect, it } from "bun:test";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

async function runImageCli(args: string[], cwd: string, env: Record<string, string>): Promise<CliResult> {
  const scriptPath = path.resolve(
    process.cwd(),
    "skills/wqq-image-gen/scripts/main.ts",
  );

  const proc = Bun.spawn(["bun", scriptPath, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      ...env,
    },
  });

  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  return { code, stdout, stderr };
}

async function writeEnvFile(baseDir: string, content: string): Promise<void> {
  const envDir = path.join(baseDir, ".wqq-skills");
  await mkdir(envDir, { recursive: true });
  await writeFile(path.join(envDir, ".env"), content, "utf8");
}

describe("wqq-image-gen env loading", () => {
  it("loads API key from $HOME/.wqq-skills/.env", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "image-gen-cwd-"));
    const fakeHome = await mkdtemp(path.join(tmpdir(), "image-gen-home-"));
    await writeEnvFile(fakeHome, "OPENAI_API_KEY=home-key\n");

    const result = await runImageCli(
      [
        "--prompt",
        "test prompt",
        "--image",
        "out.png",
        "--provider",
        "openai",
      ],
      workspace,
      {
        HOME: fakeHome,
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "http://127.0.0.1:9/v1",
      },
    );

    expect(result.code).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(
      "OPENAI_API_KEY is required",
    );
  });

  it("ignores <cwd>/.wqq-skills/.env to avoid project-local secrets", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "image-gen-cwd-"));
    const fakeHome = await mkdtemp(path.join(tmpdir(), "image-gen-home-"));

    await writeEnvFile(workspace, "OPENAI_API_KEY=cwd-key\n");

    const result = await runImageCli(
      [
        "--prompt",
        "test prompt",
        "--image",
        "out.png",
        "--provider",
        "openai",
      ],
      workspace,
      {
        HOME: fakeHome,
        OPENAI_API_KEY: "",
        OPENAI_BASE_URL: "http://127.0.0.1:9/v1",
      },
    );

    expect(result.code).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      "OPENAI_API_KEY is required",
    );
  });
});
