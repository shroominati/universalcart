import { v4 as uuidv4 } from "uuid";
import { VerumClaim, VerumClaimType, VerumEnvelope } from "../types";
import {
  VerumProvider,
  VerumProviderCapabilities,
  CreateClaimChainRequest,
  OrderClaimChainResult,
  ClaimVerificationResult,
  ChainVerificationResult,
  ClaimInspectionResult,
  VerificationCheck,
  CLAIM_TYPE_LABELS,
} from "./provider";

const PLATFORM_DID = "did:key:z6MkUniversalCartPlatform";

function mockClaim(
  type: VerumClaimType,
  issuer: string,
  dependencies: string[] = []
): VerumClaim {
  const now = new Date().toISOString();
  const contentHash = `sha256:${uuidv4().replace(/-/g, "")}`;

  const envelope: VerumEnvelope = {
    version: "ClaimEnvelopeV1",
    claimType: type,
    issuer,
    issuedAt: now,
    contentHash,
    dependencies,
    signature: `ed25519:${uuidv4().replace(/-/g, "")}`,
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

export class MockVerumProvider implements VerumProvider {
  readonly mode = "mock" as const;

  readonly capabilities: VerumProviderCapabilities = {
    generateClaims: true,
    verifyClaims: true,
    inspectClaims: true,
    explainMode:
      "Pure local mode. Claims use Verum-compatible shapes " +
      "(ClaimEnvelopeV1, did:key issuers, simulated SHA-256 hashes, " +
      "simulated Ed25519 signatures) — all values locally generated, " +
      "not cryptographically real. No external runtime. Demonstrates " +
      "the claim chain model and inspection UI without requiring " +
      "Verum infrastructure.",
  };

  async createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<OrderClaimChainResult> {
    const payment = mockClaim("payment.intent", PLATFORM_DID);
    const confirm = mockClaim("vendor.order.confirmed", req.vendorDid, [
      payment.contentHash,
    ]);
    return {
      mode: "mock",
      claims: [payment, confirm],
      warnings: [],
    };
  }

  async verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult> {
    const checks: VerificationCheck[] = [
      {
        name: "Signature",
        passed: true,
        detail: `Ed25519 signature from ${claim.issuer} (simulated)`,
      },
      {
        name: "Content Hash",
        passed: true,
        detail: "SHA-256 digest matches envelope body (simulated)",
      },
      {
        name: "Timestamp",
        passed: true,
        detail: `Issued at ${claim.timestamp}`,
      },
      {
        name: "Issuer Identity",
        passed: true,
        detail: `Resolved ${claim.issuer} (simulated)`,
      },
    ];

    if (claim.envelope?.dependencies.length) {
      checks.push({
        name: "Dependency Chain",
        passed: true,
        detail: `${claim.envelope.dependencies.length} upstream claim(s) verified (simulated)`,
      });
    }

    return { mode: "mock", valid: true, checks, warnings: [] };
  }

  async verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult> {
    const allChecks: VerificationCheck[] = [];
    let chainIntegrity = true;

    for (const claim of claims) {
      const result = await this.verifyClaim(claim);
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
        detail: "All dependency hashes resolve within the chain (simulated)",
      });
    }

    return {
      mode: "mock",
      valid: allChecks.every((c) => c.passed),
      checks: allChecks,
      chainIntegrity,
      warnings: [],
    };
  }

  async inspectClaim(claim: VerumClaim): Promise<ClaimInspectionResult> {
    return {
      mode: "mock",
      claimType: CLAIM_TYPE_LABELS[claim.type] ?? claim.type,
      issuer: claim.issuer,
      contentHash: claim.contentHash,
      dependencies: claim.envelope?.dependencies ?? [],
      verificationStatus: claim.status === "valid" ? "valid (simulated)" : claim.status,
      warnings: [],
    };
  }
}
