import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockVerumProvider } from "@/lib/verum/mock";
import { CliVerumProvider } from "@/lib/verum/cli";
import { McpVerumProvider } from "@/lib/verum/mcp";
import type { VerumClaim } from "@/lib/types";
import type {
  VerumProvider,
  CreateClaimChainRequest,
  OrderClaimChainResult,
  ClaimVerificationResult,
  ChainVerificationResult,
  ClaimInspectionResult,
} from "@/lib/verum/provider";

const VENDOR_DID =
  "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
const ORDER_ID = "test-order-001";

function req(): CreateClaimChainRequest {
  return { vendorDid: VENDOR_DID, orderId: ORDER_ID };
}

// ---------------------------------------------------------------------------
// MockVerumProvider
// ---------------------------------------------------------------------------
describe("MockVerumProvider", () => {
  let provider: MockVerumProvider;

  beforeEach(() => {
    provider = new MockVerumProvider();
  });

  it("reports mode as mock", () => {
    expect(provider.mode).toBe("mock");
  });

  it("exposes capabilities with all operations enabled", () => {
    expect(provider.capabilities.generateClaims).toBe(true);
    expect(provider.capabilities.verifyClaims).toBe(true);
    expect(provider.capabilities.inspectClaims).toBe(true);
    expect(typeof provider.capabilities.explainMode).toBe("string");
    expect(provider.capabilities.explainMode.length).toBeGreaterThan(0);
  });

  it("creates a claim chain result with mode, claims, and warnings", async () => {
    const result = await provider.createOrderClaimChain(req());
    expect(result.mode).toBe("mock");
    expect(result.claims).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it("first claim is payment.intent from platform DID", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    expect(claims[0].type).toBe("payment.intent");
    expect(claims[0].issuer).toBe("did:key:z6MkUniversalCartPlatform");
    expect(claims[0].status).toBe("valid");
  });

  it("second claim is vendor.order.confirmed from vendor DID", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    expect(claims[1].type).toBe("vendor.order.confirmed");
    expect(claims[1].issuer).toBe(VENDOR_DID);
    expect(claims[1].status).toBe("valid");
  });

  it("vendor confirm depends on payment claim hash", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    expect(claims[1].envelope?.dependencies).toContain(claims[0].contentHash);
  });

  it("claims have valid envelope structure", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    for (const claim of claims) {
      expect(claim.envelope).toBeDefined();
      expect(claim.envelope!.version).toBe("ClaimEnvelopeV1");
      expect(claim.envelope!.claimType).toBe(claim.type);
      expect(claim.envelope!.issuer).toBe(claim.issuer);
      expect(claim.envelope!.contentHash).toMatch(/^sha256:/);
      expect(claim.envelope!.signature).toMatch(/^ed25519:/);
      expect(claim.envelope!.issuedAt).toBeTruthy();
    }
  });

  it("content hashes are unique across claims", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const hashes = claims.map((c) => c.contentHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("claim IDs are unique across claims", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const ids = claims.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("verifies a single claim with mode and empty warnings", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaim(claims[0]);
    expect(result.mode).toBe("mock");
    expect(result.valid).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks.every((c) => c.passed)).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("verification checks include expected names", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaim(claims[0]);
    const names = result.checks.map((c) => c.name);
    expect(names).toContain("Signature");
    expect(names).toContain("Content Hash");
    expect(names).toContain("Timestamp");
    expect(names).toContain("Issuer Identity");
  });

  it("verifies a full claim chain with mode and empty warnings", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.mode).toBe("mock");
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("chain verification detects missing dependencies", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const [, confirm] = claims;
    const result = await provider.verifyClaimChain([confirm]);
    expect(result.chainIntegrity).toBe(false);
    const missing = result.checks.find((c) => c.name === "Missing Dependency");
    expect(missing).toBeDefined();
    expect(missing!.passed).toBe(false);
  });

  it("generates different claims across invocations", async () => {
    const a = await provider.createOrderClaimChain(req());
    const b = await provider.createOrderClaimChain(req());
    expect(a.claims[0].id).not.toBe(b.claims[0].id);
    expect(a.claims[0].contentHash).not.toBe(b.claims[0].contentHash);
  });

  it("inspects a claim with correct fields", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const inspection = await provider.inspectClaim(claims[0]);
    expect(inspection.mode).toBe("mock");
    expect(inspection.claimType).toBe("Payment Intent");
    expect(inspection.issuer).toBe("did:key:z6MkUniversalCartPlatform");
    expect(inspection.contentHash).toMatch(/^sha256:/);
    expect(inspection.dependencies).toEqual([]);
    expect(inspection.verificationStatus).toContain("valid");
    expect(inspection.warnings).toEqual([]);
  });

  it("inspects a claim with dependencies", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const inspection = await provider.inspectClaim(claims[1]);
    expect(inspection.dependencies).toHaveLength(1);
    expect(inspection.dependencies[0]).toBe(claims[0].contentHash);
  });
});

// ---------------------------------------------------------------------------
// CliVerumProvider (graceful degradation with warnings)
// ---------------------------------------------------------------------------
describe("CliVerumProvider", () => {
  let provider: CliVerumProvider;

  beforeEach(() => {
    vi.stubEnv("VERUM_CLI_PATH", "/nonexistent/verum");
    provider = new CliVerumProvider();
  });

  it("reports mode as cli", () => {
    expect(provider.mode).toBe("cli");
  });

  it("reports honest capabilities (generation false)", () => {
    expect(provider.capabilities.generateClaims).toBe(false);
    expect(typeof provider.capabilities.explainMode).toBe("string");
  });

  it("falls back to mock claims with warnings when CLI unavailable", async () => {
    const result = await provider.createOrderClaimChain(req());
    expect(result.mode).toBe("cli");
    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].type).toBe("payment.intent");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("/nonexistent/verum");
  });

  it("falls back to mock verification with warnings when CLI unavailable", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.mode).toBe("cli");
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("verifyClaim includes warnings", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaim(claims[0]);
    expect(result.mode).toBe("cli");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("inspectClaim returns result with warnings", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.inspectClaim(claims[0]);
    expect(result.mode).toBe("cli");
    expect(result.claimType).toBeTruthy();
    expect(result.issuer).toBeTruthy();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("claim structure remains valid after fallback", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    for (const claim of claims) {
      expect(claim.envelope).toBeDefined();
      expect(claim.envelope!.version).toBe("ClaimEnvelopeV1");
      expect(claim.envelope!.contentHash).toMatch(/^sha256:/);
      expect(claim.envelope!.signature).toMatch(/^ed25519:/);
    }
  });
});

// ---------------------------------------------------------------------------
// McpVerumProvider (graceful degradation with warnings)
// ---------------------------------------------------------------------------
describe("McpVerumProvider", () => {
  let provider: McpVerumProvider;

  beforeEach(() => {
    vi.stubEnv("VERUM_MCP_COMMAND", "/nonexistent/verum-mcp-server");
    provider = new McpVerumProvider();
  });

  it("reports mode as mcp", () => {
    expect(provider.mode).toBe("mcp");
  });

  it("reports honest capabilities (all false)", () => {
    expect(provider.capabilities.generateClaims).toBe(false);
    expect(provider.capabilities.verifyClaims).toBe(false);
    expect(provider.capabilities.inspectClaims).toBe(false);
  });

  it("falls back to mock claims with warnings when MCP unreachable", async () => {
    const result = await provider.createOrderClaimChain(req());
    expect(result.mode).toBe("mcp");
    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].type).toBe("payment.intent");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("verum-mcp-server");
  });

  it("falls back to mock verification with warnings when MCP unreachable", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.mode).toBe("mcp");
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("inspectClaim returns result with warnings", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    const result = await provider.inspectClaim(claims[0]);
    expect(result.mode).toBe("mcp");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("claim structure remains valid after fallback", async () => {
    const { claims } = await provider.createOrderClaimChain(req());
    for (const claim of claims) {
      expect(claim.envelope).toBeDefined();
      expect(claim.envelope!.version).toBe("ClaimEnvelopeV1");
      expect(claim.envelope!.contentHash).toMatch(/^sha256:/);
      expect(claim.envelope!.signature).toMatch(/^ed25519:/);
    }
  });
});

// ---------------------------------------------------------------------------
// Provider interface contract (all providers must satisfy)
// ---------------------------------------------------------------------------
describe("Provider interface contract", () => {
  const providers: [string, () => VerumProvider][] = [
    ["MockVerumProvider", () => new MockVerumProvider()],
    ["CliVerumProvider", () => new CliVerumProvider()],
    ["McpVerumProvider", () => new McpVerumProvider()],
  ];

  for (const [name, factory] of providers) {
    describe(name, () => {
      it("has a mode property that is a valid VerumMode", () => {
        const p = factory();
        expect(["mock", "cli", "mcp"]).toContain(p.mode);
      });

      it("has a capabilities object with required fields", () => {
        const p = factory();
        expect(typeof p.capabilities.generateClaims).toBe("boolean");
        expect(typeof p.capabilities.verifyClaims).toBe("boolean");
        expect(typeof p.capabilities.inspectClaims).toBe("boolean");
        expect(typeof p.capabilities.explainMode).toBe("string");
      });

      it("createOrderClaimChain returns OrderClaimChainResult", async () => {
        const p = factory();
        const result = await p.createOrderClaimChain(req());
        expect(["mock", "cli", "mcp"]).toContain(result.mode);
        expect(Array.isArray(result.claims)).toBe(true);
        expect(result.claims.length).toBeGreaterThan(0);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it("verifyClaim returns ClaimVerificationResult", async () => {
        const p = factory();
        const { claims } = await p.createOrderClaimChain(req());
        const result = await p.verifyClaim(claims[0]);
        expect(typeof result.valid).toBe("boolean");
        expect(["mock", "cli", "mcp"]).toContain(result.mode);
        expect(Array.isArray(result.checks)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it("verifyClaimChain returns ChainVerificationResult", async () => {
        const p = factory();
        const { claims } = await p.createOrderClaimChain(req());
        const result = await p.verifyClaimChain(claims);
        expect(typeof result.valid).toBe("boolean");
        expect(typeof result.chainIntegrity).toBe("boolean");
        expect(["mock", "cli", "mcp"]).toContain(result.mode);
        expect(Array.isArray(result.checks)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it("inspectClaim returns ClaimInspectionResult", async () => {
        const p = factory();
        const { claims } = await p.createOrderClaimChain(req());
        const result = await p.inspectClaim(claims[0]);
        expect(["mock", "cli", "mcp"]).toContain(result.mode);
        expect(typeof result.claimType).toBe("string");
        expect(typeof result.issuer).toBe("string");
        expect(typeof result.contentHash).toBe("string");
        expect(Array.isArray(result.dependencies)).toBe(true);
        expect(typeof result.verificationStatus).toBe("string");
        expect(Array.isArray(result.warnings)).toBe(true);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Warning honesty: non-mock providers always produce warnings on fallback
// ---------------------------------------------------------------------------
describe("Fallback honesty", () => {
  it("CliVerumProvider never silently returns empty warnings when unavailable", async () => {
    vi.stubEnv("VERUM_CLI_PATH", "/nonexistent/verum");
    const p = new CliVerumProvider();
    const chain = await p.createOrderClaimChain(req());
    expect(chain.warnings.length).toBeGreaterThan(0);

    const verify = await p.verifyClaimChain(chain.claims);
    expect(verify.warnings.length).toBeGreaterThan(0);

    const single = await p.verifyClaim(chain.claims[0]);
    expect(single.warnings.length).toBeGreaterThan(0);

    const inspect = await p.inspectClaim(chain.claims[0]);
    expect(inspect.warnings.length).toBeGreaterThan(0);
  });

  it("McpVerumProvider never silently returns empty warnings when unavailable", async () => {
    vi.stubEnv("VERUM_MCP_COMMAND", "/nonexistent/verum-mcp-server");
    const p = new McpVerumProvider();
    const chain = await p.createOrderClaimChain(req());
    expect(chain.warnings.length).toBeGreaterThan(0);

    const verify = await p.verifyClaimChain(chain.claims);
    expect(verify.warnings.length).toBeGreaterThan(0);

    const single = await p.verifyClaim(chain.claims[0]);
    expect(single.warnings.length).toBeGreaterThan(0);

    const inspect = await p.inspectClaim(chain.claims[0]);
    expect(inspect.warnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Config / mode selection
// ---------------------------------------------------------------------------
describe("Config", () => {
  it("defaults to mock when env is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERUM_MODE", "");
    const { getVerumMode } = await import("@/lib/verum/config");
    expect(getVerumMode()).toBe("mock");
  });

  it("reads cli mode from env", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERUM_MODE", "cli");
    const { getVerumMode } = await import("@/lib/verum/config");
    expect(getVerumMode()).toBe("cli");
  });

  it("reads mcp mode from env", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERUM_MODE", "mcp");
    const { getVerumMode } = await import("@/lib/verum/config");
    expect(getVerumMode()).toBe("mcp");
  });

  it("falls back to mock for invalid mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERUM_MODE", "invalid");
    const { getVerumMode } = await import("@/lib/verum/config");
    expect(getVerumMode()).toBe("mock");
  });

  it("getVerumMcpCommand defaults to verum-mcp-server", async () => {
    vi.stubEnv("VERUM_MCP_COMMAND", "");
    const { getVerumMcpCommand } = await import("@/lib/verum/config");
    expect(getVerumMcpCommand()).toBe("verum-mcp-server");
  });

  it("getVerumMcpArgs parses space-separated args", async () => {
    vi.stubEnv("VERUM_MCP_ARGS", "--port 3100 --verbose");
    const { getVerumMcpArgs } = await import("@/lib/verum/config");
    expect(getVerumMcpArgs()).toEqual(["--port", "3100", "--verbose"]);
  });

  it("getVerumMcpArgs returns empty array when unset", async () => {
    vi.stubEnv("VERUM_MCP_ARGS", "");
    const { getVerumMcpArgs } = await import("@/lib/verum/config");
    expect(getVerumMcpArgs()).toEqual([]);
  });
});
