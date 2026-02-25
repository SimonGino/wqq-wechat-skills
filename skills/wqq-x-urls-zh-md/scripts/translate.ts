export type TranslateMarkdownOptions = {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
  translateBodyImpl?: (body: string) => Promise<string>;
};

type OpenAiRequestInput = {
  body: string;
  fetchImpl: typeof fetch;
  env: NodeJS.ProcessEnv;
  log?: (message: string) => void;
};

type PreservedSegments = {
  body: string;
  values: string[];
};

const OPENAI_API_KEY_MISSING_ERROR =
  "Missing OPENAI_API_KEY. Set OPENAI_API_KEY to enable English->Chinese translation.";
const TRANSLATE_SYSTEM_PROMPT =
  "Translate English Markdown content to Simplified Chinese. Preserve Markdown structure exactly. Do not translate URLs, local file paths, code fences, inline code, or placeholder tokens like __WQQ_KEEP_N__. Output only translated Markdown with no explanation.";

function splitFrontmatter(markdown: string): { frontmatter: string; body: string } {
  const match = markdown.match(/^---\n[\s\S]*?\n---\n?/);
  if (!match?.[0]) {
    return { frontmatter: "", body: markdown };
  }
  return {
    frontmatter: match[0].replace(/\n?$/, "\n"),
    body: markdown.slice(match[0].length),
  };
}

function stripCodeAndLinksForDetection(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]+`/g, " ")
    .replace(/!?\[[^\]\n]*\]\((?:<)?[^)\n]+(?:>)?\)/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_\-\[\]\(\)!]/g, " ");
}

export function isLikelyEnglishMarkdown(markdown: string): boolean {
  const { body } = splitFrontmatter(markdown);
  const cleaned = stripCodeAndLinksForDetection(body);

  const latinLetters = (cleaned.match(/[A-Za-z]/g) || []).length;
  const cjkChars = (cleaned.match(/[\u3400-\u9FFF]/g) || []).length;
  const englishWords = (cleaned.match(/\b[A-Za-z]{2,}\b/g) || []).length;

  if (latinLetters < 8) return false;
  if (englishWords < 2 && !(cjkChars === 0 && latinLetters >= 12)) return false;
  if (cjkChars === 0) return true;
  return latinLetters > cjkChars * 2;
}

function preservePattern(input: string, pattern: RegExp, values: string[]): string {
  return input.replace(pattern, (match) => {
    const index = values.push(match) - 1;
    return `__WQQ_KEEP_${index}__`;
  });
}

function preserveMarkdownSegments(body: string): PreservedSegments {
  const values: string[] = [];

  let output = body;
  output = preservePattern(output, /```[\s\S]*?```/g, values);
  output = preservePattern(output, /!?\[[^\]\n]*\]\((?:<)?[^)\n]+(?:>)?\)/g, values);
  output = preservePattern(output, /`[^`\n]+`/g, values);
  output = preservePattern(output, /https?:\/\/\S+/g, values);

  return { body: output, values };
}

function restoreMarkdownSegments(body: string, values: string[]): string {
  let restored = body;
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (!value) continue;
    restored = restored.split(`__WQQ_KEEP_${i}__`).join(value);
  }

  if (/__WQQ_KEEP_\d+__/.test(restored)) {
    throw new Error("Translation output contains unresolved placeholder tokens");
  }

  return restored;
}

function extractResponseText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;

  if (Array.isArray(record.output)) {
    const lines: string[] = [];
    for (const outputItem of record.output) {
      if (!outputItem || typeof outputItem !== "object") continue;
      const content = (outputItem as Record<string, unknown>).content;
      if (!Array.isArray(content)) continue;
      for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const text = (item as Record<string, unknown>).text;
        if (typeof text === "string" && text.trim()) {
          lines.push(text.trim());
        }
      }
    }
    if (lines.length > 0) return lines.join("\n").trim();
  }

  const choices = record.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const message = (choices[0] as Record<string, unknown>)?.message;
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") return content.trim();
      if (Array.isArray(content)) {
        const lines: string[] = [];
        for (const item of content) {
          if (!item || typeof item !== "object") continue;
          const text = (item as Record<string, unknown>).text;
          if (typeof text === "string" && text.trim()) lines.push(text.trim());
        }
        return lines.join("\n").trim();
      }
    }
  }

  return "";
}

async function requestResponsesTranslation(input: OpenAiRequestInput): Promise<string> {
  const apiKey = input.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error(OPENAI_API_KEY_MISSING_ERROR);

  const baseUrl = (input.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = input.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await input.fetchImpl(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: TRANSLATE_SYSTEM_PROMPT }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: input.body }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI /responses translation failed: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI /responses translation response format is invalid");
  return text;
}

async function requestChatCompletionsTranslation(input: OpenAiRequestInput): Promise<string> {
  const apiKey = input.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error(OPENAI_API_KEY_MISSING_ERROR);

  const baseUrl = (input.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = input.env.OPENAI_MODEL || "gpt-4o-mini";

  const response = await input.fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: TRANSLATE_SYSTEM_PROMPT },
        { role: "user", content: input.body },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI /chat/completions translation failed: ${response.status}`);
  }

  const data = (await response.json()) as unknown;
  const text = extractResponseText(data);
  if (!text) throw new Error("OpenAI /chat/completions translation response format is invalid");
  return text;
}

async function requestOpenAiMarkdownTranslation(input: OpenAiRequestInput): Promise<string> {
  try {
    return await requestResponsesTranslation(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    input.log?.(`[x-urls-zh-md] responses translation fallback to chat (${message})`);
  }
  return requestChatCompletionsTranslation(input);
}

export async function translateMarkdownToChinese(
  markdown: string,
  options: TranslateMarkdownOptions = {},
): Promise<string> {
  if (!isLikelyEnglishMarkdown(markdown)) {
    return markdown;
  }

  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || fetch;
  const log = options.log;

  const { frontmatter, body } = splitFrontmatter(markdown);
  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return markdown;
  }

  const preserved = preserveMarkdownSegments(trimmedBody);
  const translatedBody = options.translateBodyImpl
    ? await options.translateBodyImpl(preserved.body)
    : await requestOpenAiMarkdownTranslation({
        body: preserved.body,
        env,
        fetchImpl,
        log,
      });

  const restoredBody = restoreMarkdownSegments(translatedBody.trim(), preserved.values);
  if (!restoredBody.trim()) {
    throw new Error("Translation output is empty");
  }

  return `${frontmatter}${restoredBody}\n`;
}
