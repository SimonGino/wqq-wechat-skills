import { describe, expect, test } from "bun:test";
import { parseExportArgs } from "./main";

describe("parseExportArgs", () => {
  test("uses defaults", () => {
    const args = parseExportArgs([]);
    expect(args.limit).toBe(50);
    expect(args.downloadMedia).toBe(true);
  });
});
