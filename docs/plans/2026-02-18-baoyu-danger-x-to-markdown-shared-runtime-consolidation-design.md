# Baoyu Danger X To Markdown Shared Runtime Consolidation Design

Date: 2026-02-18  
Status: Approved  
Owner: wqq

## 1. Background

当前 `wqq-wechat-skills` 已有 `wqq-x-bookmarks`，并已沉淀 `skills/shared/x-runtime`。  
同时新引入的 `baoyu-danger-x-to-markdown` 目录包含一套相近但独立的 X 抓取与转换实现。

直接双份维护会导致：
- 同类逻辑重复修复，长期分叉；
- X API 结构变化时需要多处同步；
- 认证、抓取、Markdown 与媒体本地化行为更难保持一致。

用户目标是长期结构最干净，因此选择将 X 核心能力进一步上收到共享层，在两个 skill 之间统一复用。

## 2. Scope

In scope:
- 统一 `baoyu-danger-x-to-markdown` 与 `wqq-x-bookmarks` 的 X 运行时核心能力到 `skills/shared/x-runtime`。
- 保持 `baoyu-danger-x-to-markdown` 用户可见行为 100% 兼容：
  - consent 机制；
  - EXTEND.md 首次配置与偏好；
  - `--login`；
  - `--json`；
  - `--download-media`。
- 明确模块边界：共享层负责技术能力，skill 入口负责业务编排。

Out of scope:
- 不新增 UI、数据库、多账号体系。
- 不改造为新产品形态。
- 不对 `wqq-wechat-article`、`wqq-image-gen` 做功能变更。

## 3. User Decisions

- 结构策略：选择“共享层上收”（长期最干净）。
- 兼容级别：100% 保留 `baoyu-danger-x-to-markdown` 现有行为。
- 约束：最小化修改，避免影响无关模块。

## 4. Approaches Considered

### Approach A: Thin wrapper over current shared (recommended initially)

将 `baoyu-danger-x-to-markdown` 做薄封装，尽量调用已有 shared，实现快速收敛。

Pros:
- 风险低，改动面可控。
- 能快速减少重复代码。

Cons:
- 部分能力可能仍在 skill 内，结构不够“最终干净”。

### Approach B: Shared-first consolidation (user selected)

优先扩展 shared，使其承载完整 X 核心能力，再让两个 skill 都仅做业务层编排。

Pros:
- 长期维护成本最低。
- 行为一致性最好。

Cons:
- 需要触达 shared 公共层，回归面更大。

### Approach C: Keep dual implementations

保留双实现，仅修补当前可用性。

Pros:
- 短期最快。

Cons:
- 长期分叉最严重，维护成本最高。

Decision: 采用 Approach B。

## 5. Architecture and Boundaries

### 5.1 Shared runtime as single source of truth

统一核心能力到：
- `skills/shared/x-runtime`

核心职责：
- cookies 加载与刷新（含登录刷新底座）；
- HTTP headers / feature switches / GraphQL 请求；
- tweet/article 抓取与结构解析；
- markdown 生成；
- media 本地化。

### 5.2 Skill-level orchestration responsibilities

`baoyu-danger-x-to-markdown` 仅保留：
- consent 文件与免责声明流程；
- EXTEND.md 读取、首次配置、偏好合并；
- CLI 参数解析与输出路径策略；
- shared 调用编排。

`wqq-x-bookmarks` 仅保留：
- bookmark 分页与去重；
- 单条导出编排、skip 策略、summary 生成；
- shared 调用编排。

### 5.3 Boundary rules

- shared 层不感知业务交互配置（如 EXTEND 首次问答、consent）。
- skill 入口不重复实现 X 运行时底层细节。
- 允许 shared 提供通用扩展接口，但不引入业务耦合。

## 6. Data Flow and Error Handling

### 6.1 baoyu-danger-x-to-markdown flow

1. 解析 CLI。
2. 校验/记录 consent。
3. 读取 EXTEND 偏好（不存在则首次配置）。
4. 合并优先级：CLI > EXTEND > 默认值。
5. 调用 shared 完成 tweet/article -> markdown。
6. 按策略执行 media 本地化。
7. 输出 markdown 路径或 JSON。

### 6.2 wqq-x-bookmarks flow

1. 分页拉取 bookmark tweet ids。
2. 对每条调用 shared 的 tweet -> markdown。
3. 可选 media 本地化。
4. skip 已导出条目。
5. 可选 summary 汇总。

### 6.3 Error layering

- shared 返回技术错误：认证失败、HTTP 状态、解析失败、网络错误。
- skill 入口做用户可读转换并决定中断策略：
  - x-to-markdown：单次任务失败即退出；
  - bookmarks：单条失败不中断总体导出。

## 7. Migration Steps and Testing Strategy

### 7.1 Migration steps

1. 先增强 shared：补齐 cookie refresh/login 相关能力与测试。
2. 改造 `baoyu-danger-x-to-markdown`：将重复底层实现替换为 shared 调用。
3. `wqq-x-bookmarks` 尽量零改动，仅在接口变化时最小适配。
4. 清理 `baoyu-danger-x-to-markdown` 的重复脚本，保留边界内文件。

### 7.2 Testing strategy

Unit tests:
- shared 新增能力（cookies refresh、关键请求路径）补充测试。
- x-to-markdown 入口层补充参数优先级与配置解析测试。
- bookmarks 现有测试保持全绿。

Smoke/CLI checks:
- `--help`
- `--login`
- tweet URL
- article URL
- `--download-media`
- `--json`
- 无 EXTEND 时首次配置流程

Regression criteria:
- 两个 skill 均运行在同一 shared 上。
- 用户可见行为与当前版本一致（100% 兼容）。

## 8. Acceptance Criteria

1. `baoyu-danger-x-to-markdown` 与 `wqq-x-bookmarks` 的 X 核心能力均来自 shared。
2. `baoyu-danger-x-to-markdown` 的 consent/EXTEND/CLI 行为保持兼容。
3. `wqq-x-bookmarks` 导出行为不退化（含 skip、summary）。
4. shared 变更有对应测试覆盖。
5. 无无关模块改动。

## 9. Risks and Mitigations

风险：
- shared 改动引发跨 skill 回归。
- X Web 结构变化导致解析波动。
- 登录刷新能力在不同环境兼容性差异。

应对：
- 先补 shared 测试，再迁移调用方。
- 保留 debug/日志能力用于快速定位。
- 接口最小增量演进，避免一次性重写。

## 10. Non-goals

- 不做平台化大重构。
- 不在 shared 中加入业务交互状态。
- 不扩展与本次目标无关的新能力。
