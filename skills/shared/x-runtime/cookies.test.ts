import { describe, expect, test } from "bun:test";
import { buildCookieHeader, hasRequiredXCookies } from "./cookies";

describe("cookies", () => {
  test("checks required cookies", () => {
    expect(hasRequiredXCookies({ auth_token: "a", ct0: "b" })).toBe(true);
  });

  test("builds cookie header", () => {
    expect(buildCookieHeader({ auth_token: "a", ct0: "b" })).toContain("auth_token=a");
  });
});
