import type { ExportArgs } from "./types";

export function parseExportArgs(_argv: string[]): ExportArgs {
  return {
    limit: 50,
    outputDir: "",
    downloadMedia: true,
  };
}
