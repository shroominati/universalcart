import { VerumClaim, VerumClaimType } from "../types";

export type VerumMode = "mock" | "cli" | "mcp";

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface VerumProviderCapabilities {
  generateClaims: boolean;
  verifyClaims: boolean;
  inspectClaims: boolean;
  explainMode: string;
}

export interface CreateClaimChainRequest {
  vendorDid: string;
  orderId: string;
}

export interface OrderClaimChainResult {
  mode: VerumMode;
  claims: VerumClaim[];
  warnings: string[];
}

export interface ClaimVerificationResult {
  mode: VerumMode;
  valid: boolean;
  checks: VerificationCheck[];
  warnings: string[];
}

export interface ChainVerificationResult {
  mode: VerumMode;
  valid: boolean;
  checks: VerificationCheck[];
  chainIntegrity: boolean;
  warnings: string[];
}

export interface ClaimInspectionResult {
  mode: VerumMode;
  claimType: string;
  issuer: string;
  contentHash: string;
  dependencies: string[];
  verificationStatus: string;
  warnings: string[];
}

export interface VerumProvider {
  readonly mode: VerumMode;
  readonly capabilities: VerumProviderCapabilities;

  createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<OrderClaimChainResult>;

  verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult>;

  verifyClaimChain(claims: VerumClaim[]): Promise<ChainVerificationResult>;

  inspectClaim(claim: VerumClaim): Promise<ClaimInspectionResult>;
}

export const CLAIM_TYPE_LABELS: Record<VerumClaimType, string> = {
  "payment.intent": "Payment Intent",
  "vendor.order.confirmed": "Vendor Confirmed",
  "fulfillment.acknowledged": "Fulfillment Acknowledged",
  "delivery.confirmed": "Delivery Confirmed",
  "refund.issued": "Refund Issued",
};

export const CLAIM_TYPE_DESCRIPTIONS: Record<VerumClaimType, string> = {
  "payment.intent":
    "Platform issues a claim that payment has been captured. This is the root of the chain — no upstream dependencies.",
  "vendor.order.confirmed":
    "Vendor issues a claim that the order is accepted. Depends on the payment.intent hash, creating a cryptographic link.",
  "fulfillment.acknowledged":
    "Vendor issues a claim that items are packed and shipped. Depends on vendor.order.confirmed.",
  "delivery.confirmed":
    "Platform issues a claim that delivery is complete. Final link in the chain.",
  "refund.issued":
    "Platform issues a claim that a refund has been processed. Branches from the original chain.",
};
