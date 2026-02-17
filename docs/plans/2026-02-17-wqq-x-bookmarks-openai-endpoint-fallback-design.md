# WQQ X Bookmarks OpenAI Endpoint Fallback Design

## Background

当前 `wqq-x-bookmarks` 的 AI 汇总仅调用 `POST /chat/completions`。在部分兼容网关中，`/responses` 可用而 `/chat/completions` 返回 404，导致 `--with-summary` 在有可用模型时仍退化到规则摘要。

目标是在不扩大改动面的前提下，提升 AI 摘要命中率并保持现有 CLI 与输出兼容。

## Goals

1. 维持最小改动，只修改 summary 相关实现和测试。
2. 新增双端点调用策略：`responses` 优先，失败回退 `chat/completions`。
3. 保持现有摘要格式与 fallback 行为稳定。
4. 不新增 CLI 参数，不改变使用方式。

## Non-Goals

1. 不引入新的 provider 抽象层。
2. 不增加并发、重试队列或限流控制改造。
3. 不修改导出流程、媒体下载流程和目录结构。

## Chosen Approach

采用“最小改动”方案，在 `generateAiSummaryForBookmark` 内实现顺序回退：

1. 先调用 `POST ${OPENAI_BASE_URL}/responses`。
2. 若 HTTP 非 2xx、返回结构不匹配、或文本不满足标签格式，自动回退 `POST ${OPENAI_BASE_URL}/chat/completions`。
3. 若两者均失败，维持当前规则 fallback（`fallbackExcerpt` + 固定相关性说明）。

请求头保持最小集合：

- `authorization: Bearer <OPENAI_API_KEY>`
- `content-type: application/json`

不强制附加 `x-api-key`、`http-referer`、`x-title`，以兼容用户已验证可用的网关配置。

## Architecture And Data Flow

核心入口不变：

- `skills/wqq-x-bookmarks/scripts/summary.ts`
- `generateAiSummaryForBookmark(...)`

内部新增两个私有步骤：

1. `callResponsesApi(...)`：负责请求 `/responses` 并抽取文本。
2. `callChatCompletionsApi(...)`：负责请求 `/chat/completions` 并抽取文本。

统一解析流程：

1. 任一路拿到文本后，交给现有 `parseAiSummaryContent(...)`。
2. `parseAiSummaryContent(...)` 成功则返回 AI 结果。
3. 失败则进入下一路或最终 fallback。

对外契约保持不变：

- `writeBookmarkSummary(...)`、`main.ts` 无需改签名。
- `SUMMARY.md` 字段结构不变（一句话摘要/相关性说明/来源链接）。

## Error Handling And Logging

### Error Priority

1. 缺少 `OPENAI_API_KEY`：保持当前行为，直接抛错。
2. `/responses` 失败：记录一次回退日志，继续尝试 `/chat/completions`。
3. `/chat/completions` 失败：记录 fallback 日志，返回规则摘要。

### Parse Failures

以下情况视为失败并触发回退：

1. HTTP 200 但响应 JSON 缺少可提取文本字段。
2. 提取到文本但不符合两行标签格式（`一句话摘要:`、`相关性说明:`）。

### Stability

1. 单条摘要失败不影响其他条目。
2. 保持串行处理，不新增并发。

## Testing Strategy

修改测试文件：

- `skills/wqq-x-bookmarks/scripts/summary.test.ts`

新增/调整测试：

1. `responses` 成功 -> 非 fallback。
2. `responses` 失败 + `chat/completions` 成功 -> 非 fallback。
3. 双端点失败 -> fallback。
4. 缺少 `OPENAI_API_KEY` -> 继续抛错（回归保障）。

回归验证：

1. 三段式渲染测试继续通过。
2. `writeBookmarkSummary` 输出结构保持不变。

## Acceptance Criteria

1. 在“仅支持 `/responses`”的网关上，`--with-summary` 可生成 AI 摘要，不再全部 fallback。
2. 在“仅支持 `/chat/completions`”的环境上，仍可通过回退路径得到 AI 摘要。
3. 双端点均失败时，导出流程不断，按现有规则摘要写入。
4. 不引入额外 CLI 配置和破坏性改动。

## Risks And Mitigations

1. `responses` 返回结构存在差异。
- Mitigation: 采用容错提取逻辑，失败自动回退 `chat/completions`。

2. 新增分支导致测试维护成本上升。
- Mitigation: 仅覆盖关键路径（成功、单路失败回退、双路失败）。

3. 网关偶发波动造成单条失败。
- Mitigation: 保持现有逐条 fallback，避免中断整批导出。

## Scope Of Code Changes

- Modify: `skills/wqq-x-bookmarks/scripts/summary.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/summary.test.ts`

不改动其他模块，保证最小化影响。
