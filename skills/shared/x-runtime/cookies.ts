import { X_REQUIRED_COOKIES } from "./constants";
import type { XCookieMap } from "./types";

export function hasRequiredXCookies(cookieMap: XCookieMap): boolean {
  return X_REQUIRED_COOKIES.every((key) => Boolean(cookieMap[key]));
}

export function buildCookieHeader(cookieMap: XCookieMap): string {
  return Object.entries(cookieMap)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}
