import { describe, expect, it } from "bun:test";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { scanWorkspaceSources } from "./workspace-ingest";

describe("scanWorkspaceSources", () => {
  it("recursively scans only .md/.txt files", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "workspace-ingest-"));
    await mkdir(path.join(workspace, "nested"), { recursive: true });

    const mdFile = path.join(workspace, "a.md");
    const txtFile = path.join(workspace, "b.txt");
    const jsonFile = path.join(workspace, "c.json");
    const nestedMd = path.join(workspace, "nested", "note.md");

    await writeFile(mdFile, "# a", "utf8");
    await writeFile(txtFile, "b", "utf8");
    await writeFile(jsonFile, "{}", "utf8");
    await writeFile(nestedMd, "# nested", "utf8");

    const files = await scanWorkspaceSources(workspace);

    expect(files).toEqual([mdFile, txtFile, nestedMd].sort());
  });

  it("excludes .git node_modules wechat-article directories", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "workspace-ingest-"));
    await mkdir(path.join(workspace, ".git"), { recursive: true });
    await mkdir(path.join(workspace, "node_modules"), { recursive: true });
    await mkdir(path.join(workspace, "wechat-article"), { recursive: true });
    await mkdir(path.join(workspace, "normal"), { recursive: true });

    const gitFile = path.join(workspace, ".git", "a.md");
    const nodeModulesFile = path.join(workspace, "node_modules", "b.txt");
    const outputFile = path.join(workspace, "wechat-article", "c.md");
    const validFile = path.join(workspace, "normal", "d.md");

    await writeFile(gitFile, "# git", "utf8");
    await writeFile(nodeModulesFile, "module", "utf8");
    await writeFile(outputFile, "# generated", "utf8");
    await writeFile(validFile, "# valid", "utf8");

    const files = await scanWorkspaceSources(workspace);

    expect(files).toEqual([validFile]);
  });
});
