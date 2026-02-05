# Claude Code 创始团队的 10 个高效使用技巧

> 帮你从新手变高手

最近，Claude Code 的创始人 Boris 在社交媒体上分享了团队内部使用 Claude Code 的实战经验。这些技巧直接来自每天高强度使用 Claude Code 的一线开发者，含金量很高。

本文整理翻译了这 10 个核心技巧，无论你是刚上手的新人，还是想进阶的老用户，都能找到提升效率的方法。

---

## 你将学到什么

- 用 git worktrees 并行运行多个 Claude 会话
- Plan Mode 的正确使用姿势
- 如何让 CLAUDE.md 越用越智能
- 自定义 Skills 实现工作自动化
- 高阶提示词技巧

---

## 技巧 1：并行工作

**这是团队公认的最大生产力提升点。**

核心思路：同时开 3-5 个 git worktrees，每个 worktree 运行独立的 Claude 会话。

### 怎么做

1. 创建多个 worktree：
```bash
git worktree add ../feature-a feature-a
git worktree add ../feature-b feature-b
git worktree add ../bugfix-c bugfix-c
```

2. 每个 worktree 启动一个 Claude Code 会话

3. 可选：设置 shell 别名快速切换
```bash
alias za="cd ~/projects/myapp-a && claude"
alias zb="cd ~/projects/myapp-b && claude"
```

### 进阶用法

有人专门留一个 worktree 只做分析——读日志、跑查询，不写代码。这样主工作区保持干净。

> 官方文档：https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees

![并行工作示意图](https://pbs.twimg.com/media/HABmmP6bwAAWgUM?format=jpg&name=medium)

---

## 技巧 2：复杂任务先进 Plan Mode

**别急着让 Claude 动手，先让它想清楚。**

### 核心原则

- 复杂任务先进入 plan mode
- 把精力投入到计划阶段，让 Claude 一次性实现

### 怎么做

1. 启动任务时明确说：「先进入 plan mode，规划一下怎么做」
2. 审核计划，确认无误后再让它执行

### 团队实践

- 有人用两个 Claude：一个写计划，另一个以 Staff Engineer 视角审核
- 一旦实现过程出问题，立刻回到 plan mode 重新规划，**不要硬推**
- 验证步骤也要用 plan mode，不只是构建阶段

![Plan Mode 示意图](https://pbs.twimg.com/media/HABm-MtbEAAMlsS?format=png&name=900x900)

---

## 技巧 3：持续投资你的 CLAUDE.md

**Claude 非常擅长给自己写规则。**

### 核心做法

每次纠正 Claude 的错误后，在对话末尾加一句：

> 「把这个经验更新到 CLAUDE.md，下次别再犯同样的错。」

### 长期效果

- 随着规则积累，Claude 的错误率会明显下降
- 要**狠心编辑**——定期清理过时或冗余的规则

### 进阶用法

有工程师让 Claude 为每个任务/项目维护一个 notes 目录，每次 PR 后更新。然后在 CLAUDE.md 里指向这些 notes。

![CLAUDE.md 示意图](https://pbs.twimg.com/media/HABoHn9bQAAE-S1?format=png&name=small)

---

## 技巧 4：创建自定义 Skills

**重复的事情，只做一次。**

### 原则

如果一件事你每天做两次以上，就该把它变成一个 skill 或 slash command。

### 团队示例

- `/techdebt` —— 每次会话结束时运行，找出并清理重复代码
- 同步命令 —— 把过去 7 天的 Slack、GDrive、Asana、GitHub 整合到一个上下文
- 分析师 agent —— 自动写 dbt models、审核代码、在 dev 环境测试

### 怎么开始

把常用的 prompt 模板保存成 skill，提交到 git，所有项目都能复用。

> 官方文档：https://code.claude.com/docs/en/skills#extend-claude-with-skills

---

## 技巧 5：让 Claude 自己修 Bug

**零上下文切换。**

### 场景 1：Slack bug 反馈

1. 启用 Slack MCP
2. 把 bug 讨论帖贴给 Claude
3. 只说一个字：「fix」

### 场景 2：CI 失败

直接说：「去把失败的 CI 测试修好」，不用告诉它具体怎么做。

### 场景 3：分布式系统排查

把 docker logs 指给 Claude，让它自己分析问题。团队反馈：Claude 在这方面出乎意料地能干。

![Bug 修复示意图](https://pbs.twimg.com/media/HABy6cObEAQ4Rep?format=png&name=900x900)

---

## 技巧 6：提示词进阶

### 策略 1：挑战 Claude

别只让它干活，让它考你：

> 「仔细审查这些改动，问我问题，直到我能通过你的测试再提 PR。」

或者：

> 「证明给我看这个方案是可行的。」——让它对比 main 分支和 feature 分支的行为差异。

### 策略 2：推倒重来

如果第一版效果平平，直接说：

> 「现在你已经完全理解问题了，把之前的方案扔掉，给我一个更优雅的实现。」

### 策略 3：减少模糊性

交接任务前，把 spec 写得越详细越好。你给的信息越具体，Claude 的输出质量越高。

---

## 技巧 7：终端环境配置

### 推荐终端：Ghostty

团队很多人在用，优点：
- 同步渲染
- 24-bit 真彩色
- 完整的 unicode 支持

### 状态栏配置

用 `/statusline` 自定义状态栏，始终显示：
- context 使用量
- 当前 git 分支

### 多任务管理

- 给终端 tab 设置颜色和名称
- 用 tmux 管理多个 worktree

### 语音输入

在 macOS 上按两下 `fn` 键开启语音输入。

说话速度是打字的 3 倍，而且你会自然地给出更详细的 prompt。

> 官方文档：https://code.claude.com/docs/en/terminal-config

![终端环境示意图](https://pbs.twimg.com/media/HABpv-MbEAAIskz?format=jpg&name=medium)

---

## 技巧 8：使用 Subagents

**让子代理分担工作，保持主窗口干净。**

### 基础用法

在 prompt 末尾加上 `use subagents`，Claude 会自动分配子任务。

### 进阶用法

- 把独立任务分配给 subagent，主 agent 的 context window 保持聚焦
- 通过 hook 把权限请求路由给 Opus 4.5，让它判断是否安全并自动批准

> 官方文档：https://code.claude.com/docs/en/hooks#permissionrequest

![Subagents 示意图](https://pbs.twimg.com/media/HAB0KLmbEAEfDJ6?format=png&name=900x900)

---

## 技巧 9：用 Claude 做数据分析

**6 个月没手写过 SQL。**

### 怎么做

让 Claude 直接调用 `bq` CLI（BigQuery 命令行）查询和分析数据。

团队做法：把 BigQuery skill 提交到代码库，所有人都能在 Claude Code 里直接用。

### 适用范围

任何有 CLI、MCP 或 API 的数据库都可以这样用。

---

## 技巧 10：用 Claude 学习

### 开启学习模式

在 `/config` 里把输出风格设置为 `Explanatory` 或 `Learning`，Claude 会解释每个改动背后的原因。

### 生成演示文稿

让 Claude 针对不熟悉的代码生成 HTML 演示文稿——它做 slides 的能力出乎意料地好。

### ASCII 图解

让 Claude 画 ASCII 图来解释新协议或代码库结构，帮助快速理解。

### 间隔重复学习

可以做一个 skill：
1. 你向 Claude 解释自己的理解
2. Claude 追问来填补知识漏洞
3. 结果存档，定期复习

---

## 总结

这 10 个技巧覆盖了 Claude Code 使用的方方面面：

| 类别 | 技巧 |
|------|------|
| 工作流 | 并行工作、Plan Mode、Subagents |
| 配置 | CLAUDE.md、Skills、终端环境 |
| 实战 | Bug 修复、数据分析 |
| 进阶 | 提示词技巧、学习模式 |

**建议从 1-2 个技巧开始实践**，比如：

- 新手：先试试 Plan Mode 和 CLAUDE.md
- 进阶用户：尝试并行工作和自定义 Skills
- 老手：玩一下 Subagents 和 Hook 自动审批

最重要的一点：**没有唯一正确的用法**。每个人的工作场景不同，多尝试，找到适合自己的方式。

---

## 参考链接

- Claude Code 官方文档 - Git Worktrees: https://code.claude.com/docs/en/common-workflows#run-parallel-claude-code-sessions-with-git-worktrees
- Claude Code 官方文档 - Skills: https://code.claude.com/docs/en/skills#extend-claude-with-skills
- Claude Code 官方文档 - Hooks: https://code.claude.com/docs/en/hooks#permissionrequest
- Claude Code 官方文档 - Terminal Config: https://code.claude.com/docs/en/terminal-config
