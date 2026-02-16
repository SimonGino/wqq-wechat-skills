# Workspace-First WeChat Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让 `wqq-wechat-article` 在默认 workspace（cwd）下自动完成素材清洗与文章资产生成，并让 `wqq-image-gen` 严格只使用 `~/.wqq-skills/.env` 的 URL/Key 配置且缺失即失败。

**Architecture:** 在 `wqq-wechat-article` 中新增 workspace-first 流程：扫描 `md/txt`、标准化 front matter、自动生成 `00-summary.md`，然后复用现有 01~04 产物生成逻辑。通过新增 `workspace-ingest.ts` 控制 `main.ts` 复杂度。`wqq-image-gen` 保持 provider 实现不变，仅加强配置加载与校验策略。

**Tech Stack:** TypeScript, Bun (`bun:test`), Node.js `fs/promises` + `path`, existing CLI scripts

---

### Task 1: Add failing CLI tests for workspace-first contract

**Relevant skills:** @test-driven-development @coding-standards

**Files:**
- Modify: `skills/wqq-wechat-article/scripts/main.test.ts`

**Step 1: Write the failing tests**

新增测试（示例骨架）：

```ts
it("uses cwd as workspace when --workspace is absent", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "wechat-article-test-"));
  await mkdir(path.join(workspace, "refs", "nested"), { recursive: true });
  await writeFile(path.join(workspace, "refs", "nested", "note.md"), "# 标题\n正文", "utf8");

  const result = await runArticleCli([], workspace, {
    WQQ_PAST_ARTICLES_DIR: undefined,
  });

  expect(result.code).toBe(0);
  const outdir = extractOutdir(`${result.stdout}\n${result.stderr}`);
  expect(await exists(path.join(outdir, "00-summary.md"))).toBeTrue();
});

it("uses --workspace directory when provided", async () => {
  const caller = await mkdtemp(path.join(tmpdir(), "wechat-article-caller-"));
  const target = await mkdtemp(path.join(tmpdir(), "wechat-article-workspace-"));
  await writeFile(path.join(target, "source.txt"), "纯文本素材", "utf8");

  const result = await runArticleCli(["--workspace", target], caller);
  expect(result.code).toBe(0);
  const outdir = extractOutdir(`${result.stdout}\n${result.stderr}`);
  expect(outdir.startsWith(path.join(target, "wechat-article"))).toBeTrue();
});

it("rejects using --workspace with --sources together", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "wechat-article-test-"));
  const sourceFile = path.join(workspace, "01.md");
  await writeFile(sourceFile, "# t\nbody", "utf8");

  const result = await runArticleCli(
    ["--workspace", workspace, "--sources", sourceFile],
    workspace,
  );

  expect(result.code).toBe(1);
  expect(`${result.stdout}\n${result.stderr}`).toContain(
    "--workspace and --sources cannot be used together",
  );
});
```

补充测试辅助函数：

```ts
async function exists(p: string): Promise<boolean> {
  try {
    await readFile(p, "utf8");
    return true;
  } catch {
    return false;
  }
}
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-wechat-article/scripts/main.test.ts`
Expected: FAIL（当前 CLI 不支持 `--workspace` 且仍强制 `--sources/--summary`）

**Step 3: Write minimal implementation placeholders**

在 `skills/wqq-wechat-article/scripts/main.ts` 先加入最小校验分支（仅用于让错误信息可控）：

```ts
if (args.workspace && args.sources.length > 0) {
  throw new Error("--workspace and --sources cannot be used together");
}
```

**Step 4: Run test to verify partial progress**

Run: `bun test skills/wqq-wechat-article/scripts/main.test.ts`
Expected: 互斥错误测试变绿，其余 workspace 测试继续红（符合 TDD 节奏）

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts/main.test.ts skills/wqq-wechat-article/scripts/main.ts
git commit -m "test: add workspace-first cli contract tests"
```

---

### Task 2: Build workspace scanner module (file discovery only)

**Relevant skills:** @coding-standards

**Files:**
- Create: `skills/wqq-wechat-article/scripts/workspace-ingest.ts`
- Create: `skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`

**Step 1: Write the failing tests**

在 `workspace-ingest.test.ts` 新增扫描测试：

```ts
describe("scanWorkspaceSources", () => {
  it("recursively scans only .md/.txt files", async () => {
    // create: a.md, b.txt, c.json
    // expect only a.md and b.txt are returned
  });

  it("excludes .git node_modules wechat-article directories", async () => {
    // create files under excluded dirs
    // expect excluded files are not returned
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: FAIL（模块不存在）

**Step 3: Write minimal implementation**

在 `workspace-ingest.ts` 实现：

```ts
export async function scanWorkspaceSources(workspace: string): Promise<string[]> {
  const out: string[] = [];
  const excluded = new Set([".git", "node_modules", "wechat-article"]);

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excluded.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (ext === ".md" || ext === ".txt") out.push(full);
    }
  }

  await walk(workspace);
  out.sort();
  return out;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts/workspace-ingest.ts skills/wqq-wechat-article/scripts/workspace-ingest.test.ts
git commit -m "feat: add workspace scanner for markdown and text sources"
```

---

### Task 3: Add front matter normalization + title fallback

**Relevant skills:** @coding-standards

**Files:**
- Modify: `skills/wqq-wechat-article/scripts/workspace-ingest.ts`
- Modify: `skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`

**Step 1: Write the failing tests**

新增测试覆盖：

```ts
it("fills minimal front matter when missing", async () => {
  const normalized = normalizeSource(rawPath, "纯文本正文", nowIso);
  expect(normalized.metadata.title).toBe("文件名回退标题");
  expect(normalized.metadata.sourcePath).toBe(rawPath);
  expect(normalized.metadata.ingestedAt).toBe(nowIso);
  expect(normalized.metadata.tags).toEqual([]);
});

it("resolves title by yaml > h1 > filename", async () => {
  // case1: YAML title exists
  // case2: no YAML title but has '# H1'
  // case3: no YAML and no H1 -> filename
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: FAIL（normalizeSource / title fallback 未实现）

**Step 3: Write minimal implementation**

在 `workspace-ingest.ts` 增加：

```ts
export type NormalizedMetadata = {
  title: string;
  source_path: string;
  ingested_at: string;
  tags: string[];
  url?: string;
  author?: string;
  date?: string;
};

export function resolveTitle(parsedYamlTitle: string | null, body: string, filePath: string): string {
  if (parsedYamlTitle?.trim()) return parsedYamlTitle.trim();
  const h1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (h1) return h1;
  return path.basename(filePath, path.extname(filePath));
}

export function normalizeSource(filePath: string, content: string, nowIso: string): { metadata: NormalizedMetadata; body: string } {
  const { yaml, body } = splitFrontmatter(content);
  const title = resolveTitle(yaml.title ?? null, body, filePath);

  return {
    metadata: {
      title,
      source_path: filePath,
      ingested_at: nowIso,
      tags: Array.isArray(yaml.tags) ? yaml.tags : [],
      url: yaml.url,
      author: yaml.author,
      date: yaml.date,
    },
    body: body.trim(),
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts/workspace-ingest.ts skills/wqq-wechat-article/scripts/workspace-ingest.test.ts
git commit -m "feat: normalize source front matter with title fallback"
```

---

### Task 4: Generate `00-summary.md` from normalized sources

**Relevant skills:** @coding-standards

**Files:**
- Modify: `skills/wqq-wechat-article/scripts/workspace-ingest.ts`
- Modify: `skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`

**Step 1: Write the failing tests**

新增 summary 相关测试：

```ts
it("builds auto summary and 3-5 outline points", () => {
  const summary = buildAutoSummary([
    { metadata: { title: "A" }, content: "x" },
    { metadata: { title: "B" }, content: "y" },
  ]);

  expect(summary.oneLiner.length).toBeGreaterThan(0);
  expect(summary.outline.length).toBeGreaterThanOrEqual(3);
  expect(summary.outline.length).toBeLessThanOrEqual(5);
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: FAIL（buildAutoSummary 未实现）

**Step 3: Write minimal implementation**

```ts
export type AutoSummary = {
  oneLiner: string;
  outline: string[];
};

export function buildAutoSummary(sources: Array<{ metadata: { title: string } }>): AutoSummary {
  const topic = sources.slice(0, 3).map((s) => s.metadata.title).join("、");
  const oneLiner = topic
    ? `这篇文章将基于 ${topic}，给出可直接落地的操作指南。`
    : "这篇文章将提供一套可直接落地的实战操作指南。";

  return {
    oneLiner,
    outline: [
      "背景与问题定义",
      "安装与初始化",
      "核心配置与执行步骤",
      "常见错误与排查",
      "落地清单与下一步",
    ],
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-wechat-article/scripts/workspace-ingest.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts/workspace-ingest.ts skills/wqq-wechat-article/scripts/workspace-ingest.test.ts
git commit -m "feat: add auto summary builder for workspace mode"
```

---

### Task 5: Integrate workspace ingest pipeline into article CLI

**Relevant skills:** @coding-standards @backend-patterns

**Files:**
- Modify: `skills/wqq-wechat-article/scripts/types.ts`
- Modify: `skills/wqq-wechat-article/scripts/main.ts`
- Modify: `skills/wqq-wechat-article/scripts/main.test.ts`

**Step 1: Write the failing integration tests**

为 CLI 增加端到端断言：

```ts
it("creates 00-summary.md and standard sources in workspace mode", async () => {
  // Arrange workspace with mixed md/txt and missing front matter
  // Act runArticleCli(["--workspace", workspace], caller)
  // Assert:
  // - 00-summary.md exists
  // - 01-sources.md exists
  // - outdir/sources/*.md all contain minimal front matter keys
});

it("keeps legacy --sources mode working", async () => {
  // Ensure existing mode still generates 01/02/03/04 files
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-wechat-article/scripts/main.test.ts`
Expected: FAIL（尚未接入 workspace-ingest）

**Step 3: Write minimal implementation**

关键改造点：

```ts
// types.ts
export type CliArgs = {
  sources: string[];
  workspace: string | null;
  summary: string | null;
  outline: string | null;
  outdir: string | null;
  help: boolean;
};
```

```ts
// main.ts - parseArgs
if (a === "--workspace") {
  const v = argv[++i];
  if (!v) throw new Error("Missing value for --workspace");
  out.workspace = v;
  continue;
}
```

```ts
// main.ts - mode selection
const workspace = path.resolve(args.workspace || process.cwd());
if (args.workspace && args.sources.length > 0) {
  throw new Error("--workspace and --sources cannot be used together");
}

let sources: Source[] = [];
let summary = args.summary;
let outline = args.outline;

if (args.sources.length > 0) {
  // legacy path
  sources = await Promise.all(args.sources.map(parseSourceFile));
  if (!summary) throw new Error("Error: --summary is required in --sources mode");
} else {
  const ingestResult = await ingestWorkspace(workspace);
  sources = ingestResult.sources;
  summary = ingestResult.summary.oneLiner;
  if (!outline) outline = ingestResult.summary.outline.join(",");
  await writeFile(path.join(outdir, "00-summary.md"), renderSummaryMd(ingestResult.summary));
}
```

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-wechat-article/scripts/main.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts/types.ts skills/wqq-wechat-article/scripts/main.ts skills/wqq-wechat-article/scripts/main.test.ts skills/wqq-wechat-article/scripts/workspace-ingest.ts skills/wqq-wechat-article/scripts/workspace-ingest.test.ts
git commit -m "feat: add workspace-first ingest pipeline for article generation"
```

---

### Task 6: Enforce strict home env URL/Key policy in image CLI

**Relevant skills:** @coding-standards

**Files:**
- Modify: `skills/wqq-image-gen/scripts/main.ts`
- Modify: `skills/wqq-image-gen/scripts/main.test.ts`
- Modify: `skills/wqq-image-gen/scripts/providers/openai.ts`
- Modify: `skills/wqq-image-gen/scripts/providers/google.ts`

**Step 1: Write the failing tests**

新增测试：

```ts
it("fails when OPENAI_BASE_URL is missing in strict mode", async () => {
  const result = await runImageCli(
    ["--prompt", "x", "--image", "out.png", "--provider", "openai"],
    workspace,
    { HOME: fakeHome, OPENAI_API_KEY: "home-key", OPENAI_BASE_URL: "" },
  );
  expect(result.code).toBe(1);
  expect(`${result.stdout}\n${result.stderr}`).toContain("OPENAI_BASE_URL is required");
});

it("fails when GOOGLE_BASE_URL is missing in strict mode", async () => {
  const result = await runImageCli(
    ["--prompt", "x", "--image", "out.png", "--provider", "google"],
    workspace,
    { HOME: fakeHome, GOOGLE_API_KEY: "home-key", GOOGLE_BASE_URL: "" },
  );
  expect(result.code).toBe(1);
  expect(`${result.stdout}\n${result.stderr}`).toContain("GOOGLE_BASE_URL is required");
});
```

**Step 2: Run test to verify it fails**

Run: `bun test skills/wqq-image-gen/scripts/main.test.ts`
Expected: FAIL（当前 provider 对 base URL 有默认值，不会失败）

**Step 3: Write minimal implementation**

```ts
// providers/openai.ts
function getOpenAIBaseUrl(): string {
  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  if (!baseURL) throw new Error("OPENAI_BASE_URL is required");
  return baseURL.replace(/\/+$/g, "");
}

const baseURL = getOpenAIBaseUrl();
```

```ts
// providers/google.ts
function getGoogleBaseUrl(): string {
  const base = process.env.GOOGLE_BASE_URL?.trim();
  if (!base) throw new Error("GOOGLE_BASE_URL is required");
  return base.replace(/\/+$/g, "");
}
```

并保留 `main.ts` 中“仅 home env”加载策略，不回退项目目录。

**Step 4: Run test to verify it passes**

Run: `bun test skills/wqq-image-gen/scripts/main.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add skills/wqq-image-gen/scripts/main.ts skills/wqq-image-gen/scripts/main.test.ts skills/wqq-image-gen/scripts/providers/openai.ts skills/wqq-image-gen/scripts/providers/google.ts
git commit -m "feat: enforce strict home env url and key policy for image generation"
```

---

### Task 7: Update docs for workspace-first flow and strict env contract

**Relevant skills:** @coding-standards

**Files:**
- Modify: `README.md`
- Modify: `skills/wqq-wechat-article/SKILL.md`
- Modify: `skills/wqq-image-gen/SKILL.md`

**Step 1: Write failing doc expectations as checklist**

创建本地 checklist（手动校验）：
- README 是否说明“默认 cwd 即 workspace，`--workspace` 可覆盖”。
- README 是否说明扫描范围和排除目录。
- README / SKILL 是否说明 `00-summary.md` 新文件。
- `wqq-image-gen` 文档是否明确 `OPENAI_BASE_URL/GOOGLE_BASE_URL` 必填。

**Step 2: Run docs smoke check**

Run: `rg -n "workspace|00-summary|OPENAI_BASE_URL|GOOGLE_BASE_URL" README.md skills/wqq-wechat-article/SKILL.md skills/wqq-image-gen/SKILL.md`
Expected: 初始缺项（可视为文档失败信号）

**Step 3: Write minimal documentation updates**

- README 增加 workspace-first 快速开始。
- `wqq-wechat-article/SKILL.md` 增加 `--workspace` 与默认 cwd 规则。
- `wqq-image-gen/SKILL.md` 增加 strict env 要求与缺失失败行为。

**Step 4: Re-run docs smoke check**

Run: `rg -n "workspace|00-summary|OPENAI_BASE_URL|GOOGLE_BASE_URL" README.md skills/wqq-wechat-article/SKILL.md skills/wqq-image-gen/SKILL.md`
Expected: 命中所有新增关键项。

**Step 5: Commit**

```bash
git add README.md skills/wqq-wechat-article/SKILL.md skills/wqq-image-gen/SKILL.md
git commit -m "docs: document workspace-first authoring and strict image env requirements"
```

---

### Task 8: Full verification and final integration commit

**Relevant skills:** @verification-before-completion

**Files:**
- Verify: `skills/wqq-wechat-article/scripts/*.ts`
- Verify: `skills/wqq-image-gen/scripts/*.ts`
- Verify: `README.md`
- Verify: `skills/wqq-wechat-article/SKILL.md`
- Verify: `skills/wqq-image-gen/SKILL.md`

**Step 1: Run targeted tests**

Run: `bun test skills/wqq-wechat-article/scripts/main.test.ts skills/wqq-wechat-article/scripts/workspace-ingest.test.ts skills/wqq-image-gen/scripts/main.test.ts`
Expected: PASS

**Step 2: Run full test suite**

Run: `bun run test`
Expected: PASS

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Manual smoke in temp workspace**

Run:

```bash
TMP_DIR=$(mktemp -d)
printf "# Demo\ncontent\n" > "$TMP_DIR/demo.md"
bun skills/wqq-wechat-article/scripts/main.ts --workspace "$TMP_DIR"
```

Expected:
- 生成 `wechat-article/<slug>/00-summary.md`
- 生成 `wechat-article/<slug>/01-sources.md`
- 生成 `wechat-article/<slug>/04-infographics/00-cover-prompt.md`

**Step 5: Commit**

```bash
git add skills/wqq-wechat-article/scripts skills/wqq-image-gen/scripts README.md skills/wqq-wechat-article/SKILL.md skills/wqq-image-gen/SKILL.md
git commit -m "feat: ship workspace-first article pipeline with strict image env policy"
```
