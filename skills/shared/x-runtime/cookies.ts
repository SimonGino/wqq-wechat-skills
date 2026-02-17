import { X_REQUIRED_COOKIES } from "./constants";
import type { XCookieMap } from "./types";

type LoadXCookiesOptions = {
  loadFromBrowser?: () => Promise<XCookieMap>;
};

const decoder = new TextDecoder();

function parseCookieHeader(header: string | undefined): XCookieMap {
  const cookieMap: XCookieMap = {};
  if (!header?.trim()) {
    return cookieMap;
  }

  for (const pair of header.split(";")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!key || !value) continue;
    cookieMap[key] = value;
  }

  return cookieMap;
}

export function hasRequiredXCookies(cookieMap: XCookieMap): boolean {
  return X_REQUIRED_COOKIES.every((key) => Boolean(cookieMap[key]));
}

export function buildCookieHeader(cookieMap: XCookieMap): string {
  return Object.entries(cookieMap)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function normalizeCookieMap(raw: unknown): XCookieMap {
  const cookieMap: XCookieMap = {};
  if (!raw || typeof raw !== "object") {
    return cookieMap;
  }

  for (const key of ["auth_token", "ct0", "gt", "twid"]) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      cookieMap[key] = value.trim();
    }
  }

  return cookieMap;
}

async function loadXCookiesFromBrowser(log?: (message: string) => void): Promise<XCookieMap> {
  const pythonScript = `
import json
values = {}
try:
    import browser_cookie3
except Exception:
    print("{}")
    raise SystemExit(0)

for domain in ("x.com", ".x.com", "twitter.com", ".twitter.com"):
    try:
        for cookie in browser_cookie3.chrome(domain_name=domain):
            if cookie.name in ("auth_token", "ct0") and cookie.value:
                values[cookie.name] = cookie.value
    except Exception:
        pass

print(json.dumps(values))
`;

  try {
    const result = Bun.spawnSync(["python3", "-c", pythonScript], {
      stdout: "pipe",
      stderr: "pipe",
    });

    if (result.exitCode !== 0) {
      const stderr = decoder.decode(result.stderr).trim();
      log?.(`[x-cookies] browser fallback failed: ${stderr || `exit code ${result.exitCode}`}`);
      return {};
    }

    const stdout = decoder.decode(result.stdout).trim();
    if (!stdout) {
      return {};
    }

    return normalizeCookieMap(JSON.parse(stdout));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log?.(`[x-cookies] browser fallback unavailable: ${message}`);
    return {};
  }
}

export async function loadXCookies(
  log?: (message: string) => void,
  options: LoadXCookiesOptions = {}
): Promise<XCookieMap> {
  const cookieHeader = process.env.X_COOKIE_HEADER?.trim() || process.env.X_COOKIES?.trim();
  const cookieMap = parseCookieHeader(cookieHeader);

  const authToken = process.env.X_AUTH_TOKEN?.trim() || process.env.AUTH_TOKEN?.trim();
  const ct0 = process.env.X_CT0?.trim() || process.env.CT0?.trim();
  if (authToken) {
    cookieMap.auth_token = authToken;
  }
  if (ct0) {
    cookieMap.ct0 = ct0;
  }

  const envCookieMap = { ...cookieMap };
  const hasEnvAuth = hasRequiredXCookies(cookieMap);
  if (!hasEnvAuth) {
    const loadFromBrowser = options.loadFromBrowser ?? (() => loadXCookiesFromBrowser(log));
    const browserCookieMap = await loadFromBrowser();
    Object.assign(cookieMap, browserCookieMap, envCookieMap);
  }

  log?.(
    `[x-cookies] loaded keys: ${Object.keys(cookieMap)
      .sort()
      .join(", ") || "none"}`
  );
  return cookieMap;
}
