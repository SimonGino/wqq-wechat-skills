# Workspace-First WeChat Skill Design

Date: 2026-02-16
Status: Approved
Owner: wqq

## 1. Background

当前 `wqq-wechat-article` 假设输入是已整理好的 `sources/*.md`。实际创作时，作者通常先进入一个新目录，把参考资料放到一个或多个子目录中，文件格式不统一，且经常缺少 YAML front matter。这导致现有流程前置成本高，且容易漏文件。

目标是把流程固定为“先清洗、再创作、再配图”，并让图片生成严格只使用 `~/.wqq-skills/.env` 中的配置。

## 2. Scope

In scope:
- `wqq-wechat-article` 新增 workspace-first 入口并内置素材清洗流程。
- `wqq-image-gen` 强制只读取 `~/.wqq-skills/.env`，配置缺失时 fail-fast。
- 保持现有输出结构，新增 `00-summary.md`。

Out of scope:
- 不改 provider 内部实现（OpenAI/Google API 请求逻辑保持不变）。
- 不引入新依赖。
- 不把项目扩展到 `pdf/docx` 解析。

## 3. User Decisions

- 入口模式：方案 A（一体化单命令）。
- workspace 规则：默认 `cwd`，传 `--workspace` 时使用指定路径。
- 扫描类型：仅 `*.md`、`*.txt`。
- 扫描深度：递归子目录。
- 默认排除：`.git`、`node_modules`、`wechat-article`。
- front matter 缺失处理：自动补齐最小字段。
- `title` 推断优先级：YAML title > 正文首个 `#` 标题 > 文件名。
- summary：自动生成并落盘 `00-summary.md`。
- 输出目录：`<workspace>/wechat-article/<topic-slug>/`。
- 改造范围：同时修改 `wqq-wechat-article` + `wqq-image-gen`。
- 图片配置异常：直接失败并给出明确报错。
- env 路径：仅 `~/.wqq-skills/.env`。

## 4. Approaches Considered

### Approach A: Single command integrated pipeline (recommended)

在 `wqq-wechat-article` 内完成扫描、规范化、summary 生成和既有文章产物生成。

Pros:
- 用户入口最简单。
- 创作过程可标准化。
- 输出结构稳定、可复用。

Cons:
- `main.ts` 编排职责会变重，需要适当模块拆分。

### Approach B: Two-phase command

第一步只清洗素材，第二步再生成文章。

Pros:
- 故障定位简单。

Cons:
- 需要两步命令，用户路径更长。

### Approach C: External runner orchestration

新增 runner 串联现有脚本，尽量不改 CLI。

Pros:
- 表面改动小。

Cons:
- 逻辑分散，长期维护和一致性较差。

Decision: 采用 Approach A。

## 5. Architecture

### 5.1 CLI Interface

`wqq-wechat-article` 新增参数：
- `--workspace <path>`（可选）

解析规则：
- 有 `--workspace`：使用该路径。
- 无 `--workspace`：使用 `process.cwd()`。
- `--workspace` 与 `--sources` 互斥。

### 5.2 Pipeline Stages

1. Scan
- 递归扫描 workspace 的 `md/txt` 文件。
- 应用排除目录规则。

2. Normalize
- 解析 YAML front matter。
- 缺失时自动补齐：`title`、`source_path`、`ingested_at`、`tags`。
- 统一写入输出目录 `sources/`。

3. Summarize
- 基于规范化素材生成 `00-summary.md`。
- 内容包含：一句话总结 + 3-5 条提纲建议。

4. Article generation
- 复用既有流程生成 `01-sources.md`、`02-outline.md`、`03-article.md`、`04-infographics/*`。

5. Image generation contract
- `wqq-image-gen` 只认 `~/.wqq-skills/.env`。
- 缺 key/url 直接失败。

## 6. Module Design

最小改动边界：
- 主要修改：
  - `skills/wqq-wechat-article/scripts/main.ts`
  - `skills/wqq-image-gen/scripts/main.ts`
- 建议新增：
  - `skills/wqq-wechat-article/scripts/workspace-ingest.ts`

`workspace-ingest.ts` 目标职责：
- 文件扫描
- front matter 规范化
- 自动 summary 生成

`main.ts` 只保留：
- 参数处理
- 阶段编排
- 文件输出调度

## 7. Data Flow

1. 输入：workspace 路径（默认 cwd 或 `--workspace`）。
2. 扫描：收集候选文件。
3. 解析：抽取 metadata + 正文。
4. 规范化：补齐最小 front matter。
5. 落盘：标准化 source 文件写入 `wechat-article/<slug>/sources/`。
6. 生成：`00-summary.md` 和既有文章/配图提示文件。
7. 图片阶段：通过 `wqq-image-gen` 使用 home env 进行生成。

## 8. Error Handling

Fail-fast policies:
- `--workspace` 与 `--sources` 同时提供 -> error。
- workspace 不存在或不可读 -> error。
- 扫描结果为空 -> error。
- front matter 全量解析失败 -> error。
- `wqq-image-gen` 必需 env 缺失 -> error。

Graceful policies:
- 单个文件 front matter 异常 -> 记录并跳过；若最终无有效文件则整体失败。

日志最小要求：
- 每个阶段打印 start/finish。
- 失败日志包含阶段名、文件路径（如有）、修复建议。

## 9. Testing Strategy

`wqq-wechat-article` 需覆盖：
- 默认 workspace=`cwd`。
- `--workspace` 指定路径生效。
- 递归扫描与排除目录。
- front matter 自动补齐。
- `title` 三层回退规则。
- `00-summary.md` 产出。
- `--workspace` 与 `--sources` 互斥。

`wqq-image-gen` 需覆盖：
- 仅从 `~/.wqq-skills/.env` 加载。
- 缺 key/url 失败并提示。

回归门槛：
- `bun run typecheck`
- `bun run test`

## 10. Acceptance Criteria

- 用户在任意新建工作目录下，直接运行 `wqq-wechat-article` 即可完成素材清洗并生成文章资产。
- 添加 `--workspace` 时能够切换到目标目录处理。
- 混乱输入（md/txt、缺 YAML）可被标准化并进入生成流程。
- 图片工具严格使用 home env，缺配置时立即失败。
- 既有 `--sources` 使用路径保持兼容。
