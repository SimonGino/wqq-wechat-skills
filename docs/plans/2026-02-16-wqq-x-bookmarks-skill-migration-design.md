# WQQ X Bookmarks Skill Migration Design

Date: 2026-02-16  
Status: Approved  
Owner: wqq

## 1. Background

当前 X 书签导出能力在参考仓库实现并验证可用，但目标维护仓库是 `/Users/wqq/Code/Playground/wqq-wechat-skills`。为避免跨仓库引用和维护分裂，需要把该能力迁移为目标仓库内的完整 skill。

目标是交付一个完全自包含的 `wqq-x-bookmarks` skill，支持调试与导出，并复用目标仓库现有的 `skills/shared` 风格、测试方式和 smoke 验证方式。

## 2. Scope

In scope:
- 在目标仓库新增完整 skill：`wqq-x-bookmarks`。
- 迁移并内聚 X 运行时必需能力（认证、请求头、GraphQL、线程抓取、tweet 转 markdown、媒体本地化）。
- 保持 PoC 已验证行为：默认导出 50、默认下载媒体、单条失败不中断、skip 已存在、目录命名为 `标题-作者-id`。
- 提供 `debug` 入口与 `export` 入口，并纳入单测和 smoke。

Out of scope:
- 不引入数据库、定时任务、多账号管理、UI。
- 不扩展到超出 PoC 的业务能力。
- 不继续依赖参考仓库路径。

## 3. User Decisions

- 迁移策略：完全自包含（不依赖参考仓库路径）。
- 交付形态：完整 Skill（`SKILL.md + scripts + tests + docs + smoke`）。
- Skill 目录名：`wqq-x-bookmarks`。
- 目录命名规则：`标题-作者-id`（标题优先取正文第一个 H1）。
- 验证频次：优先使用 `--limit 10` 做 demo 验证，再复跑验证 skip。

## 4. Approaches Considered

### Approach A: Mirror migration (fast copy)

直接镜像复制参考实现到目标仓库。

Pros:
- 最快落地。
- 与参考实现最一致。

Cons:
- 重复代码多，后续演进成本高。

### Approach B: Full refactor migration

先重构统一 X 基础层，再迁移书签逻辑。

Pros:
- 长期结构最优。

Cons:
- 首次改动过大、风险高、周期长。

### Approach C: Layered minimal migration (recommended)

先在目标仓库构建最小 `x-runtime` 共享层，再迁移 `wqq-x-bookmarks`，不做过度重构。

Pros:
- 在可控成本内实现“自包含 + 可维护”。
- 对现有仓库侵入小。

Cons:
- 相比镜像复制略慢。

Decision: 采用 Approach C。

## 5. Architecture

### 5.1 Skill layout

新增：
- `skills/wqq-x-bookmarks/SKILL.md`
- `skills/wqq-x-bookmarks/scripts/main.ts`
- `skills/wqq-x-bookmarks/scripts/debug.ts`
- `skills/wqq-x-bookmarks/scripts/bookmarks-api.ts`
- `skills/wqq-x-bookmarks/scripts/bookmarks-parser.ts`
- `skills/wqq-x-bookmarks/scripts/output.ts`
- `skills/wqq-x-bookmarks/scripts/types.ts`
- `skills/wqq-x-bookmarks/scripts/*.test.ts`
- `skills/wqq-x-bookmarks/references/*`

### 5.2 Shared runtime layer

新增共享运行时（自包含）：
- `skills/shared/x-runtime/cookies.ts`
- `skills/shared/x-runtime/http.ts`
- `skills/shared/x-runtime/graphql.ts`
- `skills/shared/x-runtime/thread.ts`
- `skills/shared/x-runtime/tweet-to-markdown.ts`
- `skills/shared/x-runtime/media-localizer.ts`
- `skills/shared/x-runtime/types.ts`

职责边界：
- `x-runtime`：X 相关底层能力。
- `wqq-x-bookmarks`：书签分页、导出编排、调试入口。

## 6. Data Flow

### 6.1 Debug flow

`debug.ts --count <n> --save-raw`
1. 加载 cookie（env/file，必要时浏览器刷新）。
2. 拉取一页书签并解析 `tweetIds` 与 `nextCursor`。
3. 控制台输出关键信息。
4. 可选落盘 raw 响应。
5. `401/403` 输出认证失效提示。

### 6.2 Export flow

`main.ts --limit <n> --output <dir> --no-download-media`
1. 加载 cookie。
2. 分页抓取书签（默认 50，按 cursor 由新到旧）。
3. 去重 `tweetId`。
4. 逐条导出：
   - `tweetId -> tweet markdown`
   - 可选媒体本地化
   - 目录命名：`标题-作者-id`
   - 以 `tweetId.md` 做全目录 skip 检测
5. 汇总输出 `success/failed/skipped`。

## 7. Reliability and Error Handling

- Retry：`429/5xx` 指数退避（1s/2s/4s）。
- Auth：`401/403` 明确提示 cookie 失效。
- Partial failure：单条失败不中断全局导出。
- Empty directory prevention：仅在拿到 markdown 后创建目标目录并写入。
- Structure drift：保留 debug raw 输出用于排障。

## 8. Acceptance Criteria

1. `wqq-x-bookmarks` 在目标仓库可独立运行，无跨仓库依赖。
2. `debug` 可稳定输出 `tweetIds/nextCursor`，可选落盘 raw。
3. `export` 默认行为满足：抓取 50、下载媒体、输出统计。
4. 目录命名满足 `标题-作者-id`，失败时不产生空目录。
5. 复跑同目录可按 `tweetId` 正确 skip。
6. 单测和 smoke 纳入 `wqq-wechat-skills` 现有体系。

## 9. Migration Plan (High-level)

1. 迁移 `x-runtime` 层并补基础测试。
2. 迁移 `wqq-x-bookmarks` 逻辑与测试（parser/api/output/debug/main）。
3. 新增 `SKILL.md`、README 片段与 references。
4. 更新 `scripts/smoke-test.sh` 以覆盖新 skill 的 help 与错误分支。
5. 用 `--limit 10` 做两轮验证（首轮导出 + 二轮 skip）。
6. 清理任何参考仓库路径耦合。

## 10. Risks and Mitigations

风险：
- X Web 结构变化导致 queryId 或 payload 解析失效。
- X API 间歇性 `503` 导致部分导出失败。

应对：
- 动态 queryId 解析 + fallback chunk 解析。
- debug raw 输出辅助排障。
- 单条失败继续策略 + 重跑 skip 降低重复成本。

## 11. Non-goals

- 不做功能泛化平台化。
- 不引入非必要抽象和配置项。
- 不改变现有 `wqq-wechat-article` / `wqq-image-gen` 行为边界。
