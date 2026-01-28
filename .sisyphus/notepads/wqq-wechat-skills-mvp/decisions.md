## 2026-01-27 MVP decisions
- MVP includes 3 skills: wqq-wechat-article (workflow), wqq-url-to-markdown (ingest), wqq-image-gen (backend).
- Output format is Markdown only; no auto publishing initially.

## 2026-01-27 Update: remove URL ingestion
- Removed URL ingestion from MVP due to scraping complexity and platform blocking.
- Workflow now assumes manual source collection into `wechat-article/<topic>/sources/*.md`.
- Active skills: wqq-wechat-article (workflow) + wqq-image-gen (backend).
