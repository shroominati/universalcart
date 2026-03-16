/**
 * Verum adapter boundary for UniversalCart.
 *
 * This module is the ONLY place product code touches Verum semantics.
 * It re-exports the provider interface, display constants, and
 * browser-facing helpers so the rest of the app stays decoupled.
 *
 * Import paths:
 *   import { createOrderClaimChain, CLAIM_TYPE_LABELS, ... } from "@/lib/verum"
 */

export {
  CLAIM_TYPE_LABELS,
  CLAIM_TYPE_DESCRIPTIONS,
  type VerumProvider,
  type VerumProviderCapabilities,
  type VerumMode,
  type VerificationCheck,
  type ClaimVerificationResult,
  type ChainVerificationResult,
  type ClaimInspectionResult,
  type OrderClaimChainResult,
  type CreateClaimChainRequest,
} from "./provider";

export { getVerumMode, VERUM_MODE_DISPLAY } from "./config";

export { MockVerumProvider } from "./mock";

import { VerumClaim } from "../types";
import type {
  ChainVerificationResult,
  ClaimInspectionResult,
  ClaimVerificationResult,
  OrderClaimChainResult,
  VerumMode,
  VerumProviderCapabilities,
} from "./provider";

export interface VerumStatusResult {
  mode: VerumMode;
  providerMode: VerumMode;
  capabilities: VerumProviderCapabilities;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Verum API request failed (${response.status})`);
  }
  return body;
}

async function requestVerumApi<T>(
  init?: Pick<RequestInit, "body" | "method">
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error(
      "Browser Verum helper called on the server. Use server-provider in server code."
    );
  }

  const response = await fetch("/api/verum", {
    method: init?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: init?.body,
    cache: "no-store",
  });

  return readJson<T>(response);
}

// ---------------------------------------------------------------------------
// Convenience functions that match the old flat API so existing callers
// (store.ts, pages, components) can migrate incrementally.
// ---------------------------------------------------------------------------

export async function createOrderClaimChain(
  vendorDid: string,
  orderId: string
): Promise<OrderClaimChainResult> {
  return requestVerumApi<OrderClaimChainResult>({
    body: JSON.stringify({
      action: "create-order-chain",
      vendorDid,
      orderId,
    }),
  });
}

export async function verifyClaimChain(
  claims: VerumClaim[]
): Promise<ChainVerificationResult> {
  return requestVerumApi<ChainVerificationResult>({
    body: JSON.stringify({
      action: "verify-chain",
      claims,
    }),
  });
}

export async function verifyClaim(
  claim: VerumClaim
): Promise<ClaimVerificationResult> {
  return requestVerumApi<ClaimVerificationResult>({
    body: JSON.stringify({
      action: "verify-claim",
      claim,
    }),
  });
}

export async function inspectClaim(
  claim: VerumClaim
): Promise<ClaimInspectionResult> {
  return requestVerumApi<ClaimInspectionResult>({
    body: JSON.stringify({
      action: "inspect-claim",
      claim,
    }),
  });
}

export async function getVerumStatus(): Promise<VerumStatusResult> {
  return requestVerumApi<VerumStatusResult>({
    method: "GET",
  });
}
