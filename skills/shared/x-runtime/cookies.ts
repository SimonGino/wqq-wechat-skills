import { X_REQUIRED_COOKIES } from "./constants";
import type { XCookieMap } from "./types";

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

export async function loadXCookies(log?: (message: string) => void): Promise<XCookieMap> {
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

  log?.(
    `[x-cookies] loaded keys: ${Object.keys(cookieMap)
      .sort()
      .join(", ") || "none"}`
  );
  return cookieMap;
}
