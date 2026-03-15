/**
 * Verum adapter boundary for UniversalCart.
 *
 * This module is the ONLY place product code touches Verum semantics.
 * It re-exports the provider interface, display constants, and a
 * mode-aware factory so the rest of the app stays decoupled.
 *
 * Import paths:
 *   import { getVerumProvider, CLAIM_TYPE_LABELS, ... } from "@/lib/verum"
 */

export {
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_DESCRIPTIONS,
  type VerumProvider,
  type VerumMode,
  type VerificationCheck,
  type ClaimVerificationResult,
  type ChainVerificationResult,
  type CreateClaimChainRequest,
} from "./provider";

export { getVerumMode, VERUM_MODE_DISPLAY } from "./config";

export { MockVerumProvider } from "./mock";

import { VerumProvider } from "./provider";
import { getVerumMode } from "./config";
import { MockVerumProvider } from "./mock";

let _cachedProvider: VerumProvider | null = null;

/**
 * Returns the VerumProvider for the current mode.
 *
 * On the client side, only MockVerumProvider is returned (CLI and MCP
 * require server runtimes). Server-side API routes get the real
 * configured provider.
 */
export function getVerumProvider(): VerumProvider {
  if (_cachedProvider) return _cachedProvider;

  const mode = getVerumMode();

  if (typeof window !== "undefined") {
    _cachedProvider = new MockVerumProvider();
    return _cachedProvider;
  }

  switch (mode) {
    case "cli": {
      // Dynamic import avoided — cli.ts uses top-level await-compatible code
      // but we lazy-construct to keep the module tree clean.
      const { CliVerumProvider } = require("./cli") as typeof import("./cli");
      _cachedProvider = new CliVerumProvider();
      break;
    }
    case "mcp": {
      const { McpVerumProvider } = require("./mcp") as typeof import("./mcp");
      _cachedProvider = new McpVerumProvider();
      break;
    }
    default:
      _cachedProvider = new MockVerumProvider();
  }

  return _cachedProvider;
}

/**
 * Resets the cached provider. Useful for tests or dynamic mode switching.
 */
export function resetProviderCache(): void {
  _cachedProvider = null;
}

// ---------------------------------------------------------------------------
// Convenience functions that match the old flat API so existing callers
// (store.ts, pages, components) can migrate incrementally.
// ---------------------------------------------------------------------------

import { VerumClaim } from "../types";

export async function createOrderClaimChain(
  vendorDid: string,
  orderId: string
): Promise<VerumClaim[]> {
  const provider = getVerumProvider();
  return provider.createOrderClaimChain({ vendorDid, orderId });
}

export async function verifyClaimChain(
  claims: VerumClaim[]
): Promise<import("./provider").ChainVerificationResult> {
  const provider = getVerumProvider();
  return provider.verifyClaimChain(claims);
}

export async function verifyClaim(
  claim: VerumClaim
): Promise<import("./provider").ClaimVerificationResult> {
  const provider = getVerumProvider();
  return provider.verifyClaim(claim);
}
