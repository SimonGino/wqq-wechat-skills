---
name: wqq-wechat-article
description: Creates Chinese tutorial-style WeChat articles in workspace-first mode. It scans local md/txt sources, normalizes metadata, auto-generates 00-summary.md, and outputs article + image prompts.
---

# WeChat Tutorial Article Workflow (MVP)

目标：把你贴的链接内容（素材）+ 你的一句话总结/大纲，整理成**中文教程类公众号文章 Markdown**，并给出 1 张公众号封面图（双裁切规范）+ 2-4 张信息图的生成提示词（可选调用 `/wqq-image-gen` 生成图片）。

## Phase 0: 风格学习（必须先执行）

在生成任何内容前，**必须**先完成以下准备：

### 1. 读取风格指南

```
references/style-guide.md
```

这是作者的写作风格总结，包含：
- 标题风格、开头模式、段落结构
- 常用句式、过渡词、禁忌
- 代码示例风格、信息密度要求

**生成的所有内容必须严格遵循此风格指南。**

### 2. （可选）读取 1-2 篇相关历史文章

按以下优先级获取 `WQQ_PAST_ARTICLES_DIR`（先文件，后环境变量）：

1. **优先**：读 `~/.wqq-skills/.env` 文件，解析其中的 `WQQ_PAST_ARTICLES_DIR` 值
   ```bash
   grep '^WQQ_PAST_ARTICLES_DIR=' ~/.wqq-skills/.env | cut -d= -f2-
   ```
2. **回退**：检查 shell 环境变量 `$WQQ_PAST_ARTICLES_DIR`

执行规则（必须严格遵循）：
1. 若两处都未配置：**直接跳过历史文章步骤**，不要猜测或搜索其他仓库/目录。
2. 若已配置且目录存在：按以下选择流程挑选 1-2 篇文章作为范例。
3. 若已配置但目录不存在：提示路径无效并跳过，不要回退到任何默认目录。

选择流程（必须严格遵循）：

1. 检查目录下是否存在 `engagement.yaml`。
2. 若存在：读取该文件，按 `score` 降序取前 10 篇文章作为**候选池**。
3. 从候选池中按"主题相近 + 结构相似"选 1-2 篇。
4. 若 `engagement.yaml` 不存在：回退到全量文章，按"主题相近 + 结构相似"选择。

选择时优先：
- 主题相近的（如都是工具教程、都是配置指南）
- 结构相似的（如都是长文、都是快速指南）
- 高 engagement 的文章代表被验证过的写作模式，应优先参考

读取后，提取该文章的：
- 章节结构
- 开头和结尾模式
- 表格和列表的使用方式
- 代码块的组织方式

---

## Usage

### Workspace-first defaults

- 默认 workspace = 当前工作目录（`cwd`）
- 可通过 `--workspace <path>` 覆盖
- `--workspace` 与 `--sources` 不能同时使用
- 扫描规则：递归查找 `*.md` / `*.txt`
- 默认排除目录：`.git`、`node_modules`、`wechat-article`

如果 front matter 缺失，系统会自动补齐最小字段：
- `title`（回退优先级：YAML title > 首个 H1 > 文件名）
- `source_path`
- `ingested_at`
- `tags`

输入（MVP）：
- 你手动收集的 sources（Markdown 文件，建议包含：来源、标题、摘录、你的理解）
- 你自己写的：一句话总结 + 可选要点大纲（偏教程：是什么/怎么用/注意事项）
- 可选：引导动作关键词（用于“回复关键词领取资料”）

输出：
- 公众号友好的 Markdown 正文
- 公众号封面图 prompt（同一张图兼容 1:1 与 2.35:1 裁切）
- 信息图清单 + 每张图的生成 prompt

建议调用链：
1. 你把素材整理为 `sources/*.md`
2. `/wqq-wechat-article`（本技能）→ 整理大纲 + 成稿 + 信息图 prompts
3. （可选）`/wqq-image-gen` → 按 prompts 生成图片

## Output

Create an output directory per article:

```
wechat-article/<topic-slug>/
  00-summary.md
  sources/
    01-source-<slug>.md
    02-source-<slug>.md
  01-sources.md
  02-outline.md
  03-article.md
  04-infographics/
    00-cover-prompt.md
    00-cover-<slug>.png
    prompts.md
    01-infographic-<slug>.png
    02-infographic-<slug>.png
```

### Output Directory Naming

- Base: `wechat-article/<topic-slug>/`
- If exists: `wechat-article/<topic-slug>-YYYYMMDD-HHMMSS/`

`<topic-slug>` rules:
- 2-4 个词，kebab-case
- 来自你的一句话总结里的主题关键词

## Workflow Steps

### Step 1: Create Output Directory

1. 解析 workspace（默认 `cwd`，或 `--workspace`）。
2. 递归扫描 workspace 中的 `*.md/*.txt`，排除 `.git`、`node_modules`、`wechat-article`。
3. 自动生成一句话总结并提取主题 → `<topic-slug>`。
4. 在 `<workspace>/wechat-article/` 下创建输出目录（冲突就加时间戳）。

### Step 2: Ingest Sources (URLs → Markdown)

将扫描到的素材标准化后写入：

`<outdir>/sources/NN-source-<slug>.md`

然后生成 `01-sources.md`（合并视图）：
- 合并所有 sources（保留每条来源的 YAML metadata）
- 最后列一个“来源链接清单”（原始 URL）

### Step 3: Produce Tutorial Outline

如果用户没有给出大纲：
- 先问 3 个最小问题：
  1) 目标读者是谁（小白/进阶/有经验）
  2) 读完要能做什么（可操作结果）
  3) 文章要覆盖哪些步骤（3-8 条即可）

输出 `02-outline.md`：
- 严格按教程结构
- 参考模板见 references

### Step 4: Draft WeChat Markdown Article

输出 `03-article.md`，**严格按照 `references/style-guide.md` 的风格要求**：

#### 结构要求（按顺序）

1. **开头**：痛点引子（1-3 句）→ 价值承诺（读完能拿到什么）→ 资源链接前置
2. **目录**：长文必须给完整目录，带序号
3. **正文**：渐进式结构
   - 是什么（定义/定位）
   - 为什么（价值/收益）
   - 怎么装（安装步骤）
   - 怎么用（核心用法）
   - 怎么配（配置详解）
   - 常见坑（踩坑与排查）
   - 附录（完整配置参考）
4. **结尾**：行动建议 + 资源链接汇总表格

#### 段落与格式

- 短段落（2-5 行），超过就拆
- 大量使用列表和表格
- 代码块必须完整可运行 + 带注释
- 每个步骤后给验证方法
- 章节间用 `---` 分隔

#### 语言风格

- 口语化但不随意，像和同事讲解
- 直接、自信、实用主义
- 用确定语气，不用"可能"、"大概"
- 常用句式："一句话总结"、"你会得到"、"先别折腾"、"如果你只想要一个结论"

#### 禁忌

- 不用"亲爱的读者"、"小伙伴们"
- 不用废话开场
- 不用长难句
- 不重复啰嗦
- 不用"感谢阅读"等套话

#### 平台合规（必须执行）

微信公众号审核严格，文章被删无法恢复。**标题和正文都必须过合规检查。**

**第一原则：内容即广告 — 教程式推广是最大风险**

整篇文章围绕一个特定第三方工具写详细教程（安装、配置、命令行用法），即使没有外链或二维码，平台也会判定为"未经授权推广第三方软件"。这是最常见的删文原因。

判定标准：如果把文章里的工具名去掉，文章就不成立了 → 这就是教程式推广。

**如何规避：**
- 文章主题应该是**方法论/思路/架构**，工具只是实现手段之一
- 不要通篇围绕一个工具的具体命令展开，改为讲"怎么做"的通用思路
- 可以提及工具名，但不要提供完整的安装/配置步骤（链接到官方文档即可）
- 标题不要出现具体工具名 — 用场景描述代替（如"晨报自动化"而非"OpenClaw 教程"）
- 涉及自动化工具（爬虫、机器人、定时任务）时尤其危险，平台对这类内容管控严格

**高危敏感词（禁止出现，必须替换或规避）：**

| 敏感词 | 替换策略 |
|--------|----------|
| Telegram / TG / 电报 | 用"消息源平台"、"频道"等泛化表述，或直接省略平台名 |
| VPN / 翻墙 / 梯子 / 科学上网 | 不提，假设读者已有网络环境 |
| Signal | 用"加密通讯工具"泛化 |
| 暗网 / Dark Web / Tor | 不碰 |
| 破解 / crack / 盗版 | 不碰 |

**中风险词（可出现但需注意上下文）：**

| 词汇 | 注意事项 |
|------|----------|
| 信息收集 / OSINT | 避免与安全攻防语境结合；用"信息聚合"、"内容订阅"等替代 |
| 爬虫 / scraping | 强调合法用途，避免暗示绕过反爬 |
| 监控 / monitoring | 用"订阅"、"追踪更新"等正向表述 |
| proxy / 代理 | 技术教程中可用，但避免暗示翻墙用途 |
| Cron / 定时任务 / 自动化脚本 | 技术语境可用，但避免与爬虫/数据抓取组合 |

**执行规则：**
1. 先做"去品牌测试" — 去掉工具名后文章是否仍有独立价值？没有就必须重构
2. 标题是重点审核对象 — 标题里不放具体工具名和高危词
3. 正文中如果必须提及某个平台/工具，用泛化描述降低命中率
4. 组合放大风险 — "信息收集 + Telegram"比单独任一个都危险得多，避免敏感词叠加
5. 拿不准时宁可模糊，文章活着比精确重要

#### 图片文件名规范化（必须执行）

源文件中的图片如果用了无意义的文件名（如 `img-20250301.png`、`pixpin-screenshot-001.png`、`截图2025.png`、`image.png` 等），在输出时**必须重命名**为有语义的名称。

规则：
- 根据图片的上下文（前后段落内容、所在章节标题）推断图片含义
- 命名格式：`<章节序号>-<描述>.png`，kebab-case，2-4 个英文词
  - 例：`03-config-overview.png`、`05-error-log-example.png`
- 如果图片有 alt text，优先参考 alt text
- 仅重命名无意义文件名，已有语义名称的保持不变
- 在输出的 `03-article.md` 中使用新文件名引用

#### 开头/结尾增长钩子（必须执行）

品牌名：**宇辰AI编程**

每篇文章必须在**开头**和**结尾**各放 1 个引导动作钩子（共 2 处），并按以下分支执行：

1) **用户未提供关键词（默认）**
- 目标：关注引导 + 交流群引导。
- 开头话术（示例）：
  - “这篇会直接带你拿到结果。我是宇辰，类似这种可落地的实战内容，我会在「宇辰AI编程」持续更新，建议先关注。”
- 结尾话术（示例）：
  - “我是宇辰，如果这篇对你有帮助，关注「宇辰AI编程」，我会继续更新同主题的实战教程。加我的 AI 编程交流群一起聊：后台回复「交流群」即可加入。”

2) **用户提供了关键词**
- 目标：用”回复关键词领取资料”做转化，并保留关注 + 交流群引导。
- 开头话术（示例）：
  - “文末给你留了资料领取方式：在「宇辰AI编程」后台回复【<关键词>】可拿完整清单。先往下看正文步骤。”
- 结尾话术（示例）：
  - “一句话总结：按文中步骤执行即可落地。想直接拿我整理好的完整版资料，后台回复【<关键词>】。我是宇辰，关注「宇辰AI编程」持续获取实战内容，回复「交流群」加入 AI 编程交流群一起进步。”

执行细则：
- 不要杜撰关键词；只有用户明确给出关键词时，才使用关键词分支。
- 同一篇文章只使用一个关键词，保持前后一致。
- 禁止”必须关注才给资料”这类强制表达，保持自然、实用、不过度营销。
- 品牌名「宇辰AI编程」在结尾必须出现至少一次，开头可自然带入。
- 交流群引导放在结尾，不要在开头提。

### Step 5: WeChat 封面图（双裁切规范，必须执行）

公众号封面只生成 **1 张源图**，但必须同时兼容两种微信裁切：
- `1:1`（转发卡片、公众号主页）
- `2.35:1`（订阅号消息列表）

输出 `04-infographics/00-cover-prompt.md`，并且必须包含以下硬性规则：

1. **画布比例**：`2.35:1`（推荐 `2350x1000` 或同等比例更高分辨率）
2. **1:1 安全区**：居中正方形；宽度占整图 `42.55%`，左右安全边距各 `28.72%`
3. **内容布局**：
   - 标题、核心主体、品牌标识必须全部落在 1:1 安全区内
   - 左右两翼仅放背景延展或装饰，不放关键信息
   - 禁止关键文字贴边或压角
4. **可读性**：
   - 封面主标题建议 `<= 12` 个汉字
   - 避免小字号密集文案，优先单焦点 + 高对比
5. **生成命令**：
   - 优先：`/wqq-image-gen --prompt "..." --image 04-infographics/00-cover-<slug>.png --ar 2.35:1`
   - 若模型不接受 `2.35:1`：使用 `--ar 21:9` 近似，并保留同样的安全区约束

### Step 6: Infographic Opportunities + Prompts

从文章中挑 2-4 个最值得配图的位置（优先）：
1. 整体流程/架构（流程图/结构图）
2. Step 汇总（清单卡片）
3. 关键对比（Do/Don't、Before/After）
4. 常见坑与排错（决策树/排错流程）

输出 `04-infographics/prompts.md`：
- 每张图：目的、放置位置、关键文案要点、建议比例（默认 `1:1`；长流程可 `9:16`）
- 每张图给出可直接用于 `/wqq-image-gen` 的英文 prompt（图中文字可要求中文）

参考模板见：[references/infographic-prompt-template.md](references/infographic-prompt-template.md)

## References

- **Style guide (MUST READ FIRST)**: [references/style-guide.md](references/style-guide.md)
- **Past articles (optional)**: `WQQ_PAST_ARTICLES_DIR`（未配置则跳过）
- **Engagement data (optional)**: `WQQ_PAST_ARTICLES_DIR/engagement.yaml`（按 score 降序取前 10 作为候选池）
- Tutorial template: [references/tutorial-template.md](references/tutorial-template.md)
- Infographic prompt template: [references/infographic-prompt-template.md](references/infographic-prompt-template.md)
