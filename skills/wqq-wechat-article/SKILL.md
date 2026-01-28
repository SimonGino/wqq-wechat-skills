---
name: wqq-wechat-article
description: Creates Chinese tutorial-style WeChat articles from pasted URL sources and a user-written one-sentence summary/outline. Outputs Markdown and a list of infographic prompts. Use when user mentions "公众号文章", "教程", "写文章大纲", or wants to turn links into a tutorial.
---

# WeChat Tutorial Article Workflow (MVP)

目标：把你贴的链接内容（素材）+ 你的一句话总结/大纲，整理成**中文教程类公众号文章 Markdown**，并给出 2-4 张信息图的生成提示词（可选调用 `/wqq-image-gen` 生成图片）。

## Usage

输入（MVP）：
- 你手动收集的 sources（Markdown 文件，建议包含：来源、标题、摘录、你的理解）
- 你自己写的：一句话总结 + 可选要点大纲（偏教程：是什么/怎么用/注意事项）

输出：
- 公众号友好的 Markdown 正文
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

输出 `03-article.md`（中文教程风格）：
- 短段落（1-3 句）
- 多用列表/编号步骤
- 每个 Step 包含：目的 → 操作 → 预期结果 → 常见坑
- 关键点用加粗，不要堆叠花哨格式
- 结尾必须包含“参考链接”区块（用素材 URL）

### Step 5: Infographic Opportunities + Prompts

从文章中挑 2-4 个最值得配图的位置（优先）：
1. 整体流程/架构（流程图/结构图）
2. Step 汇总（清单卡片）
3. 关键对比（Do/Don't、Before/After）
4. 常见坑与排错（决策树/排错流程）

输出 `04-infographics/prompts.md`：
- 每张图：目的、放置位置、关键文案要点、建议比例（默认 1:1 或 9:16）
- 每张图给出可直接用于 `/wqq-image-gen` 的英文 prompt（图中文字可要求中文）

参考模板见：[references/infographic-prompt-template.md](references/infographic-prompt-template.md)

## References

- Tutorial template: [references/tutorial-template.md](references/tutorial-template.md)
- Infographic prompt template: [references/infographic-prompt-template.md](references/infographic-prompt-template.md)

## Extension Support

Custom configurations via EXTEND.md. See Preferences sections in individual execution skills.
