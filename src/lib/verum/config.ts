import { VerumMode } from "./provider";

const VALID_MODES: VerumMode[] = ["mock", "cli", "mcp"];

export function getVerumMode(): VerumMode {
  const raw = (
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_VERUM_MODE
      : undefined
  )?.toLowerCase();

  if (raw && VALID_MODES.includes(raw as VerumMode)) {
    return raw as VerumMode;
  }
  return "mock";
}

export function getVerumCliPath(): string {
  return process.env.VERUM_CLI_PATH || "verum";
}

export function getVerumMcpCommand(): string {
  return process.env.VERUM_MCP_COMMAND || "verum-mcp-server";
}

export function getVerumMcpArgs(): string[] {
  const raw = process.env.VERUM_MCP_ARGS;
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

export const VERUM_MODE_DISPLAY: Record<
  VerumMode,
  { label: string; description: string }
> = {
  mock: {
    label: "Simulated",
    description: "All claims generated and verified locally. No Verum runtime.",
  },
  cli: {
    label: "Verum CLI",
    description:
      "Claims generated locally. Verification delegated to verum CLI where supported.",
  },
  mcp: {
    label: "Verum MCP",
    description:
      "Claims generated locally. Operations delegated to verum-mcp-server where supported.",
  },
};
