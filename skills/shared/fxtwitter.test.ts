import { describe, expect, test } from "bun:test";
import { buildFxTwitterApiUrl, fetchFxTwitterJson, parseTweetIdFromInput } from "./fxtwitter";

describe("parseTweetIdFromInput", () => {
  test("accepts a numeric tweet id", () => {
    expect(parseTweetIdFromInput("1580661436132757506")).toBe("1580661436132757506");
  });

  test("extracts id from common status urls", () => {
    expect(parseTweetIdFromInput("https://x.com/alice/status/123")).toBe("123");
    expect(parseTweetIdFromInput("https://twitter.com/alice/status/456")).toBe("456");
    expect(parseTweetIdFromInput("https://x.com/i/web/status/789")).toBe("789");
    expect(parseTweetIdFromInput("https://x.com/alice/status/101112?s=20")).toBe("101112");
  });

  test("returns null for invalid inputs", () => {
    expect(parseTweetIdFromInput("")).toBe(null);
    expect(parseTweetIdFromInput("not-a-url")).toBe(null);
    expect(parseTweetIdFromInput("https://x.com/alice")).toBe(null);
  });
});

describe("buildFxTwitterApiUrl", () => {
  test("builds api url from a status url", () => {
    expect(buildFxTwitterApiUrl("https://x.com/alice/status/123")).toBe(
      "https://api.fxtwitter.com/alice/status/123",
    );
  });

  test("builds api url from a tweet id with fallback screen name", () => {
    expect(buildFxTwitterApiUrl("123")).toBe("https://api.fxtwitter.com/i/status/123");
  });

  test("supports translateTo and custom apiBase", () => {
    expect(
      buildFxTwitterApiUrl("https://x.com/alice/status/123", {
        apiBase: "https://example.com/",
        translateTo: "zh",
      }),
    ).toBe("https://example.com/alice/status/123/zh");
  });
});

describe("fetchFxTwitterJson", () => {
  test("calls fetch with the built api url and returns parsed json", async () => {
    const calls: string[] = [];
    const fetchImpl = async (url: string | URL): Promise<Response> => {
      calls.push(String(url));
      return new Response(JSON.stringify({ ok: true, tweet: { id: "123" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const data = await fetchFxTwitterJson("https://x.com/alice/status/123", { fetchImpl });

    expect(calls).toEqual(["https://api.fxtwitter.com/alice/status/123"]);
    expect(data).toEqual({ ok: true, tweet: { id: "123" } });
  });

  test("throws on non-ok responses", async () => {
    const fetchImpl = async (): Promise<Response> => new Response("nope", { status: 404 });
    await expect(fetchFxTwitterJson("123", { fetchImpl })).rejects.toThrow("404");
  });
});

