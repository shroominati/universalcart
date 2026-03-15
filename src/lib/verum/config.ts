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

export function getVerumMcpUrl(): string {
  const host = process.env.VERUM_MCP_HOST || "localhost";
  const port = process.env.VERUM_MCP_PORT || "3100";
  return `http://${host}:${port}`;
}

export const VERUM_MODE_DISPLAY: Record<VerumMode, { label: string; description: string }> = {
  mock: {
    label: "Simulated",
    description: "Claims are locally simulated — no Verum runtime connected",
  },
  cli: {
    label: "Verum CLI",
    description: "Claims signed and verified via the verum-cli binary",
  },
  mcp: {
    label: "Verum MCP",
    description: "Claims processed through verum-mcp-server",
  },
};
