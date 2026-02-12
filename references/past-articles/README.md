# 历史文章目录

这是占位目录。

默认情况下，`wqq-wechat-article` 不会强依赖仓库内的历史文章。
推荐在本地私有目录维护历史文章，并通过 `WQQ_PAST_ARTICLES_DIR` 指向该目录。

例如在 `~/.wqq-skills/.env` 中配置：

```env
WQQ_PAST_ARTICLES_DIR=/absolute/path/to/your/past-articles
```

如果未配置该变量，历史文章参考步骤会被跳过。

## 命名建议

建议使用可读性高的文件名，例如：
- `2024-01-claude-code-教程.md`
- `2024-02-remotion-实战指南.md`

## 文件格式

- 使用普通 Markdown 即可（不强制 YAML frontmatter）
- 一篇文章一个文件

这些文章会作为风格参考，用于生成新的公众号内容。
