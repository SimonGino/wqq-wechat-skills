import { buildCookieHeader } from "./cookies";
import type { XCookieMap } from "./types";

export function buildRequestHeaders(cookieMap: XCookieMap): Record<string, string> {
  return {
    accept: "application/json",
    cookie: buildCookieHeader(cookieMap),
    "x-csrf-token": cookieMap.ct0 ?? "",
  };
}
