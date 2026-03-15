import { VerumClaim, VerumClaimType, VerumEnvelope } from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * Verum integration layer for UniversalCart.
 *
 * In production, this module shells out to the `verum-cli` binary or connects
 * to a `verum-mcp-server` instance. For the MVP the cryptographic operations
 * are simulated with the same data shapes so the UI/API contract is stable.
 */

const PLATFORM_DID = "did:key:z6MkUniversalCartPlatform";

export function createClaim(
  type: VerumClaimType,
  issuer: string,
  dependencies: string[] = []
): VerumClaim {
  const now = new Date().toISOString();
  const contentHash = `sha256:${uuidv4().replace(/-/g, "")}`;
  const signature = `ed25519:${uuidv4().replace(/-/g, "")}`;

  const envelope: VerumEnvelope = {
    version: "ClaimEnvelopeV1",
    claimType: type,
    issuer,
    issuedAt: now,
    contentHash,
    dependencies,
    signature,
  };

  return {
    id: `claim-${uuidv4().slice(0, 8)}`,
    type,
    issuer,
    contentHash,
    timestamp: now,
    status: "valid",
    envelope,
  };
}

export function createPaymentIntentClaim(): VerumClaim {
  return createClaim("payment.intent", PLATFORM_DID);
}

export function createVendorConfirmClaim(
  vendorDid: string,
  paymentClaimHash: string
): VerumClaim {
  return createClaim("vendor.order.confirmed", vendorDid, [paymentClaimHash]);
}

export function createFulfillmentClaim(
  vendorDid: string,
  orderClaimHash: string
): VerumClaim {
  return createClaim("fulfillment.acknowledged", vendorDid, [orderClaimHash]);
}

export function createDeliveryConfirmClaim(
  confirmHash: string
): VerumClaim {
  return createClaim("delivery.confirmed", PLATFORM_DID, [confirmHash]);
}

export function verifyClaim(claim: VerumClaim): {
  valid: boolean;
  checks: VerificationCheck[];
} {
  const checks: VerificationCheck[] = [
    {
      name: "Signature",
      passed: true,
      detail: `Ed25519 signature from ${claim.issuer}`,
    },
    {
      name: "Content Hash",
      passed: true,
      detail: `SHA-256 digest matches envelope body`,
    },
    {
      name: "Timestamp",
      passed: true,
      detail: `Issued at ${claim.timestamp}`,
    },
    {
      name: "Issuer Identity",
      passed: true,
      detail: `Resolved ${claim.issuer}`,
    },
  ];

  if (claim.envelope?.dependencies.length) {
    checks.push({
      name: "Dependency Chain",
      passed: true,
      detail: `${claim.envelope.dependencies.length} upstream claim(s) verified`,
    });
  }

  return {
    valid: checks.every((c) => c.passed),
    checks,
  };
}

export function verifyClaimChain(claims: VerumClaim[]): {
  valid: boolean;
  checks: VerificationCheck[];
  chainIntegrity: boolean;
} {
  const allChecks: VerificationCheck[] = [];
  let chainIntegrity = true;

  for (const claim of claims) {
    const result = verifyClaim(claim);
    allChecks.push(...result.checks);
    if (!result.valid) chainIntegrity = false;
  }

  const hashes = new Set(claims.map((c) => c.contentHash));
  for (const claim of claims) {
    if (claim.envelope) {
      for (const dep of claim.envelope.dependencies) {
        if (!hashes.has(dep)) {
          chainIntegrity = false;
          allChecks.push({
            name: "Missing Dependency",
            passed: false,
            detail: `Claim ${claim.id} references unknown hash ${dep.slice(0, 16)}…`,
          });
        }
      }
    }
  }

  if (chainIntegrity) {
    allChecks.push({
      name: "Chain Integrity",
      passed: true,
      detail: "All dependency hashes resolve within the chain",
    });
  }

  return {
    valid: allChecks.every((c) => c.passed),
    checks: allChecks,
    chainIntegrity,
  };
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  detail: string;
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
