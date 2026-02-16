import { describe, expect, test } from "bun:test";
import { buildCookieHeader, hasRequiredXCookies, loadXCookies } from "./cookies";

describe("cookies", () => {
  test("checks required cookies", () => {
    expect(hasRequiredXCookies({ auth_token: "a", ct0: "b" })).toBe(true);
  });

  test("builds cookie header", () => {
    expect(buildCookieHeader({ auth_token: "a", ct0: "b" })).toContain("auth_token=a");
  });

  test("loads cookies from env", async () => {
    process.env.X_AUTH_TOKEN = "env-auth";
    process.env.X_CT0 = "env-ct0";
    try {
      const cookieMap = await loadXCookies();
      expect(cookieMap.auth_token).toBe("env-auth");
      expect(cookieMap.ct0).toBe("env-ct0");
    } finally {
      delete process.env.X_AUTH_TOKEN;
      delete process.env.X_CT0;
    }
  });
});
