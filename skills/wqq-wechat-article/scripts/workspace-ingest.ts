import path from "node:path";
import { readdir } from "node:fs/promises";

export async function scanWorkspaceSources(workspace: string): Promise<string[]> {
  const files: string[] = [];
  const excluded = new Set([".git", "node_modules", "wechat-article"]);

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (excluded.has(entry.name)) continue;
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".md" || ext === ".txt") {
        files.push(fullPath);
      }
    }
  }

  await walk(workspace);
  files.sort();
  return files;
}
