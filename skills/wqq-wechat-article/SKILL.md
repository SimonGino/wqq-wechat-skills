---
name: wqq-wechat-article
description: Creates Chinese tutorial-style WeChat articles from pasted URL sources and a user-written one-sentence summary/outline. Outputs Markdown, a dual-crop cover prompt, and infographic prompts. Use when user mentions "公众号文章", "教程", "写文章大纲", or wants to turn links into a tutorial.
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

先检查环境变量 `WQQ_PAST_ARTICLES_DIR`（建议配置在 `~/.wqq-skills/.env`）：

```env
WQQ_PAST_ARTICLES_DIR=/absolute/path/to/your/past-articles
```

执行规则（必须严格遵循）：
1. 若变量已配置且目录存在：从该目录中选择 1-2 篇与当前主题最相关的文章作为范例。
2. 若变量未配置：**直接跳过历史文章步骤**，不要猜测或搜索其他仓库/目录。
3. 若变量已配置但目录不存在：提示路径无效并跳过，不要回退到任何默认目录。

如果执行了历史文章步骤，选择标准如下：
- 优先选择主题相近的（如都是工具教程、都是配置指南）
- 优先选择结构相似的（如都是长文、都是快速指南）

读取后，提取该文章的：
- 章节结构
- 开头和结尾模式
- 表格和列表的使用方式
- 代码块的组织方式

---

## Usage

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

1. 从一句话总结里提取主题 → 生成 `<topic-slug>`。
2. 在 `wechat-article/` 下创建输出目录（冲突就加时间戳）。

### Step 2: Ingest Sources (URLs → Markdown)

把你手动整理的 sources 放在：

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

#### 开头/结尾增长钩子（必须执行）

每篇文章必须在**开头**和**结尾**各放 1 个引导动作钩子（共 2 处），并按以下分支执行：

1) **用户未提供关键词（默认）**
- 目标：只做“关注”引导，不承诺关键词资料。
- 开头话术（示例）：
  - "这篇会直接带你拿到结果。类似这种可落地的实战内容，我会持续更新，建议先关注，后面按系列学更省时间。"
- 结尾话术（示例）：
  - "如果这篇对你有帮助，点个关注。我会继续更新同主题的实战教程，下一篇会讲 <下篇主题>。"

2) **用户提供了关键词**
- 目标：用“回复关键词领取资料”做转化，并保留关注引导。
- 开头话术（示例）：
  - "文末给你留了资料领取方式：回复【<关键词>】可拿完整清单（命令/配置/排错表）。先往下看正文步骤。"
- 结尾话术（示例）：
  - "一句话总结：按文中步骤执行即可落地。想直接拿我整理好的完整版资料，后台回复【<关键词>】。如果你希望持续收到这类实战内容，记得关注。"

执行细则：
- 不要杜撰关键词；只有用户明确给出关键词时，才使用关键词分支。
- 同一篇文章只使用一个关键词，保持前后一致。
- 禁止“必须关注才给资料”这类强制表达，保持自然、实用、不过度营销。

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

- **Style guide (MUST READ FIRST)**: [../../references/style-guide.md](../../references/style-guide.md)
- **Past articles (optional)**: `WQQ_PAST_ARTICLES_DIR`（未配置则跳过）
- Tutorial template: [references/tutorial-template.md](references/tutorial-template.md)
- Infographic prompt template: [references/infographic-prompt-template.md](references/infographic-prompt-template.md)

## Extension Support

Custom configurations via EXTEND.md. See Preferences sections in individual execution skills.
