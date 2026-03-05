# Design: Engagement-based past article selection

## Problem

The current SKILL.md selects past articles purely by topic similarity, ignoring actual performance data. High-performing articles represent validated writing patterns and should be prioritized as references.

## Constraints

- WeChat account is a personal, uncertified subscription account
- Official data statistics APIs require certified service accounts -- not available
- No automated data extraction path exists

## Design

### Data source

Manual: user screenshots the WeChat backend "content analysis" page, Claude parses the data and writes/updates `engagement.yaml`.

### engagement.yaml

Location: `WQQ_PAST_ARTICLES_DIR/engagement.yaml` (alongside the article markdown files).

Fields per article:
- `title`: article title (for matching)
- `date`: publish date
- `reads`: page views
- `likes`: thumbs up count
- `shares`: share/forward count
- `recommends`: "在看" (looking) count
- `comments`: comment count
- `score`: weighted composite score

Score formula (priority: reads > recommends > shares > likes > comments):
```
score = reads * 1 + recommends * 5 + shares * 3 + likes * 2 + comments * 1
```

### Selection logic (SKILL.md step 2)

1. Check for `engagement.yaml` in `WQQ_PAST_ARTICLES_DIR`
2. If exists: take top 10 by score as candidate pool
3. From candidate pool: select 1-2 by topic + structure similarity
4. If no engagement.yaml: fall back to current logic (all articles, topic similarity only)

### What changed

- New file: `WQQ_PAST_ARTICLES_DIR/engagement.yaml`
- Modified: `skills/wqq-wechat-article/SKILL.md` step 2 selection logic
- No changes to `main.ts` (directory resolution unchanged)
