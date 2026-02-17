# WQQ X Bookmarks OpenAI Endpoint Fallback Implementation Plan

> Source design: `docs/plans/2026-02-17-wqq-x-bookmarks-openai-endpoint-fallback-design.md`

## Goal

在保持最小改动的前提下，让 `--with-summary` 的 AI 摘要调用支持：

1. 优先 `POST /responses`
2. 失败自动回退 `POST /chat/completions`
3. 双端点失败时继续规则 fallback，不中断导出

## Scope

- Modify: `skills/wqq-x-bookmarks/scripts/summary.ts`
- Modify: `skills/wqq-x-bookmarks/scripts/summary.test.ts`

## Task 1: 补齐测试覆盖（先测后改）

### 1.1 新增 `responses` 成功用例

- 文件：`skills/wqq-x-bookmarks/scripts/summary.test.ts`
- 目标：验证 `generateAiSummaryForBookmark` 在 `/responses` 返回可解析文本时，`usedFallback=false`。

断言：

1. 返回 `oneLineSummary` 包含测试摘要文本
2. 返回 `relevanceReason` 包含相关性文本
3. `usedFallback` 为 `false`

### 1.2 新增“responses 失败 -> chat 成功”用例

- 同文件新增 fake fetch，按调用顺序：
1. 第一次返回 404（模拟 `/responses` 不可用）
2. 第二次返回 chat completion 成功 payload

断言：

1. 最终仍成功解析 AI 摘要
2. `usedFallback=false`

### 1.3 新增“双端点失败”回退用例

- 同文件新增 fake fetch：两次都失败（throw 或非 2xx）
- 断言走规则 fallback：
1. `oneLineSummary === fallbackExcerpt`
2. `relevanceReason` 包含固定默认文案
3. `usedFallback=true`

### 1.4 运行测试确认失败/红灯

运行：

```bash
bun test skills/wqq-x-bookmarks/scripts/summary.test.ts
```

预期：新增端点相关用例先失败，驱动实现。

## Task 2: 在 summary.ts 实现双端点策略（最小改动）

### 2.1 增加 `/responses` 请求与文本提取函数

在 `summary.ts` 中新增私有函数：

1. 构建请求体（使用 `input`）
2. 请求 `${baseUrl}/responses`
3. 从响应中提取文本（兼容常见结构）

说明：只使用以下请求头：

- `authorization`
- `content-type`

### 2.2 保留并封装现有 `/chat/completions` 逻辑

- 将当前 chat 请求拆成私有函数，返回文本字符串。
- 维持当前 model/baseUrl/env 默认值策略。

### 2.3 更新 `generateAiSummaryForBookmark` 主流程

顺序改为：

1. 先尝试 `responses`
2. 失败再尝试 `chat/completions`
3. 任一路成功后统一 `parseAiSummaryContent`
4. 两路都失败 -> 规则 fallback

### 2.4 日志策略最小增强

- 在 `responses` 失败但即将回退时，输出一条简短日志。
- 最终 fallback 日志沿用当前样式。

## Task 3: 回归验证

### 3.1 执行单测

```bash
bun test skills/wqq-x-bookmarks/scripts/summary.test.ts
```

预期：全部通过。

### 3.2 可选集成验证（本地手动）

在真实网关环境执行：

```bash
set -a; source ~/.wqq-skills/.env; set +a
bun skills/wqq-x-bookmarks/scripts/main.ts --limit 10 --with-summary
```

验收点：

1. `SUMMARY.md` 中出现 AI 生成内容（非大面积 fallback）
2. 不出现因 `/chat/completions` 404 导致的全量 fallback

## Task 4: 提交改动

```bash
git add skills/wqq-x-bookmarks/scripts/summary.ts skills/wqq-x-bookmarks/scripts/summary.test.ts
git commit -m "feat: support responses-first fallback for bookmark AI summary"
```

## Risks

1. `/responses` 响应结构存在供应商差异
- 处理：提取逻辑容错，失败自动回退 chat

2. 过度扩展导致代码复杂化
- 处理：仅在 `summary.ts` 内增加必要私有函数，不引入新模块

## Done Criteria

1. 单测通过并覆盖 3 条核心路径（responses 成功、回退成功、双失败 fallback）
2. 对外行为兼容（CLI 参数、输出结构不变）
3. 变更范围严格限制在 summary 实现与测试
