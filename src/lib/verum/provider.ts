import { VerumClaim, VerumClaimType } from "../types";

export type VerumMode = "mock" | "cli" | "mcp";

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface ClaimVerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
}

export interface ChainVerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  chainIntegrity: boolean;
}

export interface CreateClaimChainRequest {
  vendorDid: string;
  orderId: string;
}

export interface VerumProvider {
  readonly mode: VerumMode;

  createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<VerumClaim[]>;

  verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult>;

  verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult>;
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
    "Platform attests that payment has been captured and held in escrow.",
  "vendor.order.confirmed":
    "Vendor attests that the order has been received and accepted.",
  "fulfillment.acknowledged":
    "Vendor attests that items have been packed and shipped.",
  "delivery.confirmed":
    "Platform attests that delivery has been completed successfully.",
  "refund.issued":
    "Platform attests that a refund has been processed for this order.",
};
