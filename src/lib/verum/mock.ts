import { v4 as uuidv4 } from "uuid";
import { VerumClaim, VerumClaimType, VerumEnvelope } from "../types";
import {
  VerumProvider,
  CreateClaimChainRequest,
  ClaimVerificationResult,
  ChainVerificationResult,
  VerificationCheck,
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

  async createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<VerumClaim[]> {
    const payment = mockClaim("payment.intent", PLATFORM_DID);
    const confirm = mockClaim("vendor.order.confirmed", req.vendorDid, [
      payment.contentHash,
    ]);
    return [payment, confirm];
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

    return { valid: true, checks };
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
      valid: allChecks.every((c) => c.passed),
      checks: allChecks,
      chainIntegrity,
    };
  }
}
