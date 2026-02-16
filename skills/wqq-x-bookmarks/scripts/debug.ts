import type { DebugArgs } from "./types";

function parsePositiveInt(input: string, flagName: string): number {
  const value = Number.parseInt(input, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return value;
}

export function parseDebugArgs(argv: string[]): DebugArgs {
  const args: DebugArgs = {
    count: 20,
    saveRaw: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") {
      const value = argv[++i];
      if (!value) {
        throw new Error("Missing value for --count");
      }
      args.count = parsePositiveInt(value, "--count");
      continue;
    }

    if (arg === "--save-raw") {
      args.saveRaw = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return args;
}
