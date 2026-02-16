---
name: wqq-image-gen
description: Generates WeChat cover and infographic images from prompts using official OpenAI or Google image APIs. Supports prompt files, aspect ratios, quality presets, and JSON output. Use when user asks to create an infographic or WeChat cover image.
---

# Image Generation (MVP)

Official API-based image generation. Supports OpenAI and Google providers.

## Script Directory

**Agent Execution**:
1. `SKILL_DIR` = this SKILL.md file's directory
2. Script path = `${SKILL_DIR}/scripts/main.ts`

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
test -f .wqq-skills/wqq-image-gen/EXTEND.md && echo "project"
test -f "$HOME/.wqq-skills/wqq-image-gen/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────┬───────────────────┐
│ Path                                             │ Location          │
├──────────────────────────────────────────────────┼───────────────────┤
│ .wqq-skills/wqq-image-gen/EXTEND.md              │ Project directory │
│ $HOME/.wqq-skills/wqq-image-gen/EXTEND.md        │ User home         │
└──────────────────────────────────────────────────┴───────────────────┘

## Usage

```bash
# Basic
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "An infographic about X" --image out.png

# With prompt files
npx -y bun ${SKILL_DIR}/scripts/main.ts --promptfiles system.md content.md --image out.png

# With aspect ratio (infographic: 1:1/9:16, WeChat cover: 2.35:1)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "..." --image out.png --ar 9:16

# WeChat cover (single image for dual crop: 1:1 + 2.35:1)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "..." --image cover.png --ar 2.35:1

# Force provider
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "..." --image out.png --provider google
```

## WeChat Cover Dual-Crop Rule

When generating one WeChat cover image to be cropped in both `1:1` and `2.35:1`:

- Prefer `--ar 2.35:1` (fallback `--ar 21:9` if provider/model rejects `2.35:1`)
- Keep all critical elements in a centered `1:1` safe area
- The safe area width should be about `42.55%` of total width
- Use side areas only for background extension (no critical text)

## Options

| Option | Description |
|--------|-------------|
| `--prompt <text>`, `-p` | Prompt text |
| `--promptfiles <files...>` | Read prompt from files (concatenated) |
| `--image <path>` | Output image path (required) |
| `--provider google\|openai` | Force provider (auto-detect by API keys) |
| `--model <id>`, `-m` | Model ID |
| `--ar <ratio>` | Aspect ratio (e.g., `16:9`, `9:16`, `1:1`, `2.35:1`) |
| `--size <WxH>` | Size hint (e.g., `1024x1024`) |
| `--quality normal\|2k` | Quality preset (default: `2k`) |
| `--ref <files...>` | Reference images (Google multimodal only) |
| `--json` | JSON output |
| `--help`, `-h` | Show help |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for OpenAI provider) |
| `GOOGLE_API_KEY` | Google API key (required for Google provider) |
| `GEMINI_API_KEY` | Alias for `GOOGLE_API_KEY` |
| `OPENAI_IMAGE_MODEL` | Default OpenAI image model |
| `GOOGLE_IMAGE_MODEL` | Default Google image model |
| `OPENAI_BASE_URL` | OpenAI endpoint (required) |
| `GOOGLE_BASE_URL` | Google endpoint (required) |

Strict env policy:
- Only loads env file from `$HOME/.wqq-skills/.env`
- Never loads `<cwd>/.wqq-skills/.env`
- Missing `OPENAI_BASE_URL` or `GOOGLE_BASE_URL` fails fast with explicit error

Env file merge order: process.env first, then missing keys are filled from `$HOME/.wqq-skills/.env`.

## Extension Support

Custom configurations via EXTEND.md. See Preferences section.
