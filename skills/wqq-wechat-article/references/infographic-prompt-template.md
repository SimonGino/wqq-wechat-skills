# Infographic Prompt Template (for wqq-image-gen)

目标：生成“信息密度高但不拥挤”的公众号配图（信息图/示意图）。

## Per-Image Spec

### 1) Purpose

- What does this image teach?
- Where will it be placed in the article?

### 2) Key Content (Chinese)

- Title (<= 12 Chinese characters)
- 3-6 bullet points
- Optional: small footer note (source/remark)

### 3) Layout

- Prefer: clean grid-cards / flow / do-dont / checklist
- Keep large margins, avoid tiny text

### 4) Style

- Modern, minimal, high contrast
- Flat vector or clean infographic
- No excessive decoration

### 5) Aspect Ratio

- Default: 1:1
- Alternative: 9:16 (for long step-by-step)

## Prompt (English)

Use this structure for `/wqq-image-gen`:

```
Create a clean modern infographic in Chinese.
Topic: <topic>.
Layout: <layout>.
Include title: "<Chinese title>".
Include bullet points (Chinese):
- ...
- ...
Design constraints:
- High contrast, minimal style, lots of whitespace
- Clear hierarchy (title > section headers > bullets)
- Avoid tiny text, avoid clutter
- No watermark
```

If you need a diagram:

```
Create a clean schematic diagram in Chinese.
Show: <components and arrows>.
Use labeled boxes and arrows, simple icons.
Design constraints:
- Minimal, high contrast, readable labels
- No photorealism, no busy background
```
