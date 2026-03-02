# 拆分 X 技能到 yuchen-skills 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `wqq-x-bookmarks` 和 `wqq-x-to-md` 及其共享运行时从 `wqq-wechat-skills` 拆分到新仓库 `~/Code/Personal/yuchen-skills`。

**Architecture:** 文件拷贝方式（不保留 git 历史）。先建新仓库并验证通过，再从旧仓库删除。技能目录去掉 `wqq-` 前缀，跨技能依赖的 `output.ts` 移入 `shared/x-runtime/`。

**Tech Stack:** Bun 运行时、TypeScript、Claude Code 技能插件系统（`.claude-plugin/marketplace.json`）

---

## 阶段一：搭建 yuchen-skills

### Task 1: 初始化新仓库并拷贝文件

**Files:**
- Create: `~/Code/Personal/yuchen-skills/` (新 git 仓库)
- Copy: `skills/shared/` → 新仓库
- Copy: `skills/wqq-x-bookmarks/` → 新仓库 `skills/x-bookmarks/`
- Copy: `skills/wqq-x-to-md/` → 新仓库 `skills/x-to-md/`

**Step 1: 创建目录并初始化 git**

```bash
mkdir -p ~/Code/Personal/yuchen-skills
cd ~/Code/Personal/yuchen-skills
git init
```

Expected: `Initialized empty Git repository`

**Step 2: 拷贝 shared 目录**

```bash
mkdir -p ~/Code/Personal/yuchen-skills/skills
cp -r ~/Code/Personal/wqq-wechat-skills/skills/shared \
      ~/Code/Personal/yuchen-skills/skills/
```

**Step 3: 拷贝 X 技能并重命名（去掉 wqq- 前缀）**

```bash
cp -r ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-bookmarks \
      ~/Code/Personal/yuchen-skills/skills/x-bookmarks
cp -r ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-to-md \
      ~/Code/Personal/yuchen-skills/skills/x-to-md
```

**Step 4: 验证目录结构**

```bash
ls ~/Code/Personal/yuchen-skills/skills/
```

Expected: `shared/  x-bookmarks/  x-to-md/`

---

### Task 2: 移动 output.ts 到 shared/x-runtime

将 `x-bookmarks/scripts/output.ts` 和 `output.test.ts` 移到 `shared/x-runtime/`，消除跨技能直接依赖。

**Files:**
- Move: `skills/x-bookmarks/scripts/output.ts` → `skills/shared/x-runtime/output.ts`
- Move: `skills/x-bookmarks/scripts/output.test.ts` → `skills/shared/x-runtime/output.test.ts`

**工作目录:** `~/Code/Personal/yuchen-skills`

**Step 1: 移动文件**

```bash
cd ~/Code/Personal/yuchen-skills
mv skills/x-bookmarks/scripts/output.ts skills/shared/x-runtime/output.ts
mv skills/x-bookmarks/scripts/output.test.ts skills/shared/x-runtime/output.test.ts
```

**Step 2: 验证文件已移动**

```bash
ls skills/shared/x-runtime/output*
```

Expected: `skills/shared/x-runtime/output.ts  skills/shared/x-runtime/output.test.ts`

```bash
ls skills/x-bookmarks/scripts/output* 2>&1
```

Expected: 找不到文件（已移走）

---

### Task 3: 更新 x-bookmarks 的 import 路径

`output.ts` 移走后，`x-bookmarks/scripts/main.ts` 需要更新 import 路径。

**Files:**
- Modify: `~/Code/Personal/yuchen-skills/skills/x-bookmarks/scripts/main.ts`

**Step 1: 更新 main.ts 中的 output import**

在 `skills/x-bookmarks/scripts/main.ts` 中，将：

```ts
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "./output";
```

改为：

```ts
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "../../shared/x-runtime/output";
```

---

### Task 4: 更新 x-to-md 的 import 路径

`x-to-md` 原来跨技能引用 `wqq-x-bookmarks/scripts/output`，现在改为引用 `shared/x-runtime/output`。

**Files:**
- Modify: `~/Code/Personal/yuchen-skills/skills/x-to-md/scripts/main.ts`

**Step 1: 更新 main.ts 中的 output import**

在 `skills/x-to-md/scripts/main.ts` 中，将：

```ts
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "../../wqq-x-bookmarks/scripts/output";
```

改为：

```ts
import {
  buildTweetOutputDirName,
  findExistingTweetMarkdownPath,
  resolveTweetOutputPath,
  shouldSkipTweetOutput,
} from "../../shared/x-runtime/output";
```

---

### Task 5: 删除 x-to-md SKILL.md 中的 Next Step 引用

**Files:**
- Modify: `~/Code/Personal/yuchen-skills/skills/x-to-md/SKILL.md`

**Step 1: 删除 "Next Step (WeChat Article)" 段落**

删除 SKILL.md 末尾的整个段落：

```markdown
## Next Step (WeChat Article)

导出完成后可直接作为素材 workspace：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts --workspace <output>
```
```

---

### Task 6: 创建配置文件

**Files:**
- Create: `~/Code/Personal/yuchen-skills/package.json`
- Create: `~/Code/Personal/yuchen-skills/tsconfig.json`
- Create: `~/Code/Personal/yuchen-skills/.gitignore`

**Step 1: 创建 package.json**

```json
{
  "name": "yuchen-skills",
  "version": "0.1.0",
  "private": true,
  "description": "X/Twitter 媒体平台研究的个人 Claude Code 技能",
  "scripts": {
    "test": "bun test skills/**/*.test.ts",
    "typecheck": "bunx tsc --noEmit"
  },
  "devDependencies": {
    "bun-types": "^1.3.7"
  }
}
```

**Step 2: 创建 tsconfig.json**

直接从 `wqq-wechat-skills/tsconfig.json` 复制，内容不变：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "lib": ["ESNext"],
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["bun-types"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "skills/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    ".wqq-skills",
    ".baoyu-skills"
  ]
}
```

**Step 3: 创建 .gitignore**

```
.idea
.wqq-skills/
.baoyu-skills/
.DS_Store
**/.DS_Store
node_modules/
dist/
bun.lockb
```

---

### Task 7: 创建 CLAUDE.md（中文）

**Files:**
- Create: `~/Code/Personal/yuchen-skills/CLAUDE.md`

**Step 1: 写入 CLAUDE.md**

```markdown
# CLAUDE.md

这个仓库包含用于 X/Twitter 媒体平台研究的个人 Claude Code 技能。

## 原则

- 工作流定义在 `SKILL.md` + `references/` 中。
- 确定性操作在 `scripts/*.ts` 中，通过 Bun 执行。
- MVP 阶段不引入外部 npm 依赖（仅使用 Bun 运行时）。

## 运行脚本

```bash
npx -y bun skills/<skill>/scripts/main.ts --help
```

### 直接执行

```bash
# 导出 X 书签
npx -y bun skills/x-bookmarks/scripts/main.ts --limit 50

# 将 X 链接转为 Markdown
npx -y bun skills/x-to-md/scripts/main.ts \
  --urls https://x.com/<user>/status/<id>
```

## 密钥管理

- API 密钥放在 `$HOME/.wqq-skills/.env`。
- 不要提交密钥；`.wqq-skills/` 已被 gitignore。
- 仅从文件读取的密钥：`OPENAI_API_KEY`、`OPENAI_BASE_URL`。
- X 认证：`X_AUTH_TOKEN`、`X_CT0`（或通过 `python3` + `browser_cookie3` 自动从 Chrome 读取 cookies）。

## 开发

### 类型检查

```bash
bun run typecheck
```

### 测试

```bash
bun run test
```

### 项目结构

```
skills/
  shared/              # 公共工具
    retry.ts           # 指数退避重试
    arg-parser.ts      # CLI 参数解析
    wqq-skills-env.ts  # 环境变量/密钥加载
    x-runtime/         # X/Twitter API 客户端、认证、媒体下载
  x-bookmarks/         # 导出 X 书签为 Markdown
    scripts/main.ts    # CLI 入口
    SKILL.md           # 技能文档
  x-to-md/             # 将 X 链接转为 Markdown
    scripts/main.ts    # CLI 入口
    SKILL.md           # 技能文档
```
```

---

### Task 8: 创建 marketplace.json

**Files:**
- Create: `~/Code/Personal/yuchen-skills/.claude-plugin/marketplace.json`

**Step 1: 创建目录和文件**

```bash
mkdir -p ~/Code/Personal/yuchen-skills/.claude-plugin
```

**Step 2: 写入 marketplace.json**

```json
{
  "name": "yuchen-skills",
  "owner": {
    "name": "wqq",
    "email": ""
  },
  "metadata": {
    "description": "X/Twitter 媒体平台研究的个人技能",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "x-media-tools",
      "description": "X/Twitter 内容导出与研究工具",
      "source": "./",
      "strict": false,
      "skills": [
        "./skills/x-bookmarks",
        "./skills/x-to-md"
      ]
    }
  ]
}
```

---

### Task 9: 安装依赖并验证

**工作目录:** `~/Code/Personal/yuchen-skills`

**Step 1: 安装 bun-types**

```bash
cd ~/Code/Personal/yuchen-skills && bun install
```

Expected: `bun-types` 安装成功，生成 `bun.lock`。

**Step 2: 运行 typecheck**

```bash
cd ~/Code/Personal/yuchen-skills && bun run typecheck
```

Expected: 无错误输出。

**Step 3: 运行测试**

```bash
cd ~/Code/Personal/yuchen-skills && bun run test
```

Expected: 所有测试通过。

**如果 typecheck 或测试失败：** 修复 import 路径问题后重新验证，不要继续到下一个 task。

---

### Task 10: 初始提交

**工作目录:** `~/Code/Personal/yuchen-skills`

**Step 1: 暂存所有文件**

```bash
cd ~/Code/Personal/yuchen-skills
git add .
git status
```

验证文件列表正确。

**Step 2: 提交**

```bash
git commit -m "feat: 初始提交 — X/Twitter 媒体研究技能

从 wqq-wechat-skills 拆分而来，包含：
- x-bookmarks: 导出 X 书签为 Markdown
- x-to-md: 将 X 链接转为 Markdown + 中文摘要
- shared/x-runtime: X API 客户端、认证、媒体下载"
```

---

## 阶段二：清理 wqq-wechat-skills

### Task 11: 删除 X 相关文件

**工作目录:** `~/Code/Personal/wqq-wechat-skills`

**Step 1: 删除 X 技能目录**

```bash
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-bookmarks
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/wqq-x-to-md
```

**Step 2: 删除 shared/x-runtime**

```bash
rm -rf ~/Code/Personal/wqq-wechat-skills/skills/shared/x-runtime
```

**Step 3: 验证保留的文件完整**

```bash
ls ~/Code/Personal/wqq-wechat-skills/skills/shared/
```

Expected: `arg-parser.ts  arg-parser.test.ts  retry.ts  retry.test.ts  wqq-skills-env.ts`

```bash
ls ~/Code/Personal/wqq-wechat-skills/skills/
```

Expected: `shared/  wqq-image-gen/  wqq-wechat-article/`

---

### Task 12: 更新 wqq-skills-env.ts — 移除 getXOutputBaseDir

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/skills/shared/wqq-skills-env.ts`

**Step 1: 删除 getXOutputBaseDir 函数**

删除文件末尾的：

```ts
export function getXOutputBaseDir(homeDir?: string): string {
  const envPath = getWqqSkillsEnvFilePath(homeDir);
  const env = loadDotEnvFileSync(envPath);
  return env.X_OUTPUT_DIR || process.cwd();
}
```

这个函数仅被 X 技能使用，WeChat 技能不需要。

---

### Task 13: 更新 smoke-test.sh — 删除 X 相关测试

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/scripts/smoke-test.sh`

**Step 1: 删除 Test 7、8、9**

删除以下三段测试（从 `# Test 7:` 到 `# Test 9:` 的 `fi` 结束）：

```bash
# Test 7: wqq-x-bookmarks export help
echo -n "Testing wqq-x-bookmarks export --help... "
output=$(bun skills/wqq-x-bookmarks/scripts/main.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 8: wqq-x-bookmarks debug help
echo -n "Testing wqq-x-bookmarks debug --help... "
output=$(bun skills/wqq-x-bookmarks/scripts/debug.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi

# Test 9: wqq-x-to-md help
echo -n "Testing wqq-x-to-md --help... "
output=$(bun skills/wqq-x-to-md/scripts/main.ts --help 2>&1)
if echo "$output" | grep -q "Usage:"; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${RED}✗${NC}"
  exit 1
fi
```

---

### Task 14: 更新 CLAUDE.md — 移除 X 相关内容

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/CLAUDE.md`

**Step 1: 更新项目结构段落**

将项目结构中的：

```
skills/
  shared/              # Shared utilities
    retry.ts           # Retry with exponential backoff
    arg-parser.ts      # CLI argument parsing helpers
  wqq-image-gen/       # Image generation skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
  wqq-wechat-article/  # WeChat article skill
    scripts/main.ts    # CLI entry point
    SKILL.md           # Skill documentation
```

替换原来包含 x-runtime 的版本（如果有的话）。确保不包含任何 x-runtime、x-bookmarks、x-to-md 的引用。

---

### Task 15: 更新 README.md — 移除 X 技能说明

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/README.md`

**Step 1: 更新仓库介绍（第 1-7 行）**

将：

```markdown
# wqq-wechat-skills

这是一个面向微信公众号教程写作的个人技能仓库，包含：
- `wqq-wechat-article`：把素材整理成教程型公众号文章
- `wqq-image-gen`：生成封面图与信息图（OpenAI / Google）
- `wqq-x-bookmarks`：导出 X 书签为 Markdown（支持 debug、skip、`--with-summary` AI 汇总）
- `wqq-x-to-md`：将指定 X 链接导出为 Markdown，保留原文并自动生成中文摘要
```

改为：

```markdown
# wqq-wechat-skills

这是一个面向微信公众号教程写作的个人技能仓库，包含：
- `wqq-wechat-article`：把素材整理成教程型公众号文章
- `wqq-image-gen`：生成封面图与信息图（OpenAI / Google）
```

**Step 2: 删除 "3) X 书签导出" 段落（第 40-55 行）**

删除：

```markdown
### 3) X 书签导出

```bash
# 先验证认证
npx -y bun skills/wqq-x-bookmarks/scripts/debug.ts --count 5 --save-raw

# 再导出（默认 50 条，默认下载媒体）
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --output /tmp/wqq-x-bookmarks-demo

# 导出并生成 AI 汇总（需要 OPENAI_API_KEY）
npx -y bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --with-summary --output /tmp/wqq-x-bookmarks-demo
```

`--with-summary` 说明：
- 缺少 `OPENAI_API_KEY` 会直接报错
- OpenAI 请求失败时自动回退到规则摘要，不影响其他条目导出
```

**Step 3: 删除 "4) 指定 X 链接导出" 段落（第 57-70 行）**

删除：

```markdown
### 4) 指定 X 链接导出（自动生成中文摘要）

```bash
npx -y bun skills/wqq-x-to-md/scripts/main.ts \
  --urls \
  https://x.com/elvissun/status/2025920521871716562 \
  https://x.com/wangzan101/status/2025948108098854969
```

导出后可直接作为 `wqq-wechat-article` 的 workspace：

```bash
npx -y bun skills/wqq-wechat-article/scripts/main.ts --workspace ./wqq-x-to-md-output
```
```

**Step 4: 删除环境变量中的 X 相关说明（第 173-174 行）**

删除：

```markdown
- `wqq-x-bookmarks` 的 `--with-summary` 会从 `~/.wqq-skills/.env` 读取 `OPENAI_API_KEY/OPENAI_BASE_URL`。
- `wqq-x-to-md` 的中文摘要会从 `~/.wqq-skills/.env` 读取 `OPENAI_API_KEY/OPENAI_BASE_URL`。
```

**Step 5: 更新项目结构（第 200-209 行）**

将：

```text
skills/
  shared/              # 公共工具
  wqq-image-gen/       # 图片生成技能
  wqq-wechat-article/  # 文章生成技能
  wqq-x-bookmarks/     # X 书签导出技能
  wqq-x-to-md/        # 指定 X 链接导出 + 中文摘要
scripts/
  smoke-test.sh        # 冒烟测试脚本
```

改为：

```text
skills/
  shared/              # 公共工具
  wqq-image-gen/       # 图片生成技能
  wqq-wechat-article/  # 文章生成技能
scripts/
  smoke-test.sh        # 冒烟测试脚本
```

---

### Task 16: 更新 .gitignore — 移除 X 相关项

**Files:**
- Modify: `~/Code/Personal/wqq-wechat-skills/.gitignore`

**Step 1: 删除 X 输出目录**

删除这一行：

```
wqq-x-bookmarks-output/
```

---

### Task 17: 验证 wqq-wechat-skills

**工作目录:** `~/Code/Personal/wqq-wechat-skills`

**Step 1: 运行 typecheck**

```bash
cd ~/Code/Personal/wqq-wechat-skills && bun run typecheck
```

Expected: 无错误。

**Step 2: 运行测试**

```bash
cd ~/Code/Personal/wqq-wechat-skills && bun run test
```

Expected: 所有测试通过（仅 wqq-wechat-article 和 wqq-image-gen 的测试）。

**如果失败：** 检查是否有残留的 X 相关 import，修复后重新验证。

---

### Task 18: 提交清理

**工作目录:** `~/Code/Personal/wqq-wechat-skills`

**Step 1: 暂存所有变更**

```bash
cd ~/Code/Personal/wqq-wechat-skills
git add -A
git status
```

验证：只有删除的 X 文件和更新的配置文件。

**Step 2: 提交**

```bash
git commit -m "chore: 拆分 X 技能到 yuchen-skills 仓库

删除 wqq-x-bookmarks、wqq-x-to-md 和 shared/x-runtime。
这些技能现在维护在 ~/Code/Personal/yuchen-skills。"
```
