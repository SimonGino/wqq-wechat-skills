import { describe, expect, test } from "bun:test";
import { parseExportArgs } from "./main";

describe("parseExportArgs", () => {
  test("uses defaults", () => {
    const args = parseExportArgs([]);
    expect(args.limit).toBe(50);
    expect(args.downloadMedia).toBe(true);
  });

  test("parses limit and no-download-media", () => {
    const args = parseExportArgs(["--limit", "10", "--no-download-media"]);
    expect(args.limit).toBe(10);
    expect(args.downloadMedia).toBe(false);
  });
});
