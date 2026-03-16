import "server-only";

import { getVerumMode } from "./config";
import { CliVerumProvider } from "./cli";
import { McpVerumProvider } from "./mcp";
import { MockVerumProvider } from "./mock";
import type { VerumMode, VerumProvider } from "./provider";

let cachedProvider: VerumProvider | null = null;

function createProvider(mode: VerumMode): VerumProvider {
  switch (mode) {
    case "cli":
      return new CliVerumProvider();
    case "mcp":
      return new McpVerumProvider();
    default:
      return new MockVerumProvider();
  }
}

export function getVerumProvider(): VerumProvider {
  if (cachedProvider) return cachedProvider;

  cachedProvider = createProvider(getVerumMode());
  return cachedProvider;
}

export function resetProviderCache(): void {
  cachedProvider = null;
}
