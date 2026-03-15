import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockVerumProvider } from "@/lib/verum/mock";
import { CliVerumProvider } from "@/lib/verum/cli";
import { McpVerumProvider } from "@/lib/verum/mcp";
import type { VerumClaim } from "@/lib/types";
import type { VerumProvider, CreateClaimChainRequest } from "@/lib/verum/provider";

const VENDOR_DID = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";
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

  it("creates a claim chain with 2 claims", async () => {
    const claims = await provider.createOrderClaimChain(req());
    expect(claims).toHaveLength(2);
  });

  it("first claim is payment.intent from platform DID", async () => {
    const [payment] = await provider.createOrderClaimChain(req());
    expect(payment.type).toBe("payment.intent");
    expect(payment.issuer).toBe("did:key:z6MkUniversalCartPlatform");
    expect(payment.status).toBe("valid");
  });

  it("second claim is vendor.order.confirmed from vendor DID", async () => {
    const [, confirm] = await provider.createOrderClaimChain(req());
    expect(confirm.type).toBe("vendor.order.confirmed");
    expect(confirm.issuer).toBe(VENDOR_DID);
    expect(confirm.status).toBe("valid");
  });

  it("vendor confirm depends on payment claim hash", async () => {
    const [payment, confirm] = await provider.createOrderClaimChain(req());
    expect(confirm.envelope?.dependencies).toContain(payment.contentHash);
  });

  it("claims have valid envelope structure", async () => {
    const claims = await provider.createOrderClaimChain(req());
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
    const claims = await provider.createOrderClaimChain(req());
    const hashes = claims.map((c) => c.contentHash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it("claim IDs are unique across claims", async () => {
    const claims = await provider.createOrderClaimChain(req());
    const ids = claims.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("verifies a single claim as valid", async () => {
    const [claim] = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaim(claim);
    expect(result.valid).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("verification checks include expected names", async () => {
    const [claim] = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaim(claim);
    const names = result.checks.map((c) => c.name);
    expect(names).toContain("Signature");
    expect(names).toContain("Content Hash");
    expect(names).toContain("Timestamp");
    expect(names).toContain("Issuer Identity");
  });

  it("verifies a full claim chain as valid", async () => {
    const claims = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
  });

  it("chain verification detects missing dependencies", async () => {
    const claims = await provider.createOrderClaimChain(req());
    // Remove the payment claim so the dependency is broken
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
    expect(a[0].id).not.toBe(b[0].id);
    expect(a[0].contentHash).not.toBe(b[0].contentHash);
  });
});

// ---------------------------------------------------------------------------
// CliVerumProvider (graceful degradation)
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

  it("falls back to mock claims when CLI is unavailable", async () => {
    const claims = await provider.createOrderClaimChain(req());
    expect(claims).toHaveLength(2);
    expect(claims[0].type).toBe("payment.intent");
    expect(claims[1].type).toBe("vendor.order.confirmed");
  });

  it("falls back to mock verification when CLI is unavailable", async () => {
    const claims = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
  });

  it("claim structure remains valid after fallback", async () => {
    const claims = await provider.createOrderClaimChain(req());
    for (const claim of claims) {
      expect(claim.envelope).toBeDefined();
      expect(claim.envelope!.version).toBe("ClaimEnvelopeV1");
      expect(claim.envelope!.contentHash).toMatch(/^sha256:/);
      expect(claim.envelope!.signature).toMatch(/^ed25519:/);
    }
  });
});

// ---------------------------------------------------------------------------
// McpVerumProvider (graceful degradation)
// ---------------------------------------------------------------------------
describe("McpVerumProvider", () => {
  let provider: McpVerumProvider;

  beforeEach(() => {
    vi.stubEnv("VERUM_MCP_HOST", "localhost");
    vi.stubEnv("VERUM_MCP_PORT", "19999"); // unlikely to be running
    provider = new McpVerumProvider();
  });

  it("reports mode as mcp", () => {
    expect(provider.mode).toBe("mcp");
  });

  it("falls back to mock claims when MCP is unreachable", async () => {
    const claims = await provider.createOrderClaimChain(req());
    expect(claims).toHaveLength(2);
    expect(claims[0].type).toBe("payment.intent");
    expect(claims[1].type).toBe("vendor.order.confirmed");
  });

  it("falls back to mock verification when MCP is unreachable", async () => {
    const claims = await provider.createOrderClaimChain(req());
    const result = await provider.verifyClaimChain(claims);
    expect(result.valid).toBe(true);
    expect(result.chainIntegrity).toBe(true);
  });

  it("claim structure remains valid after fallback", async () => {
    const claims = await provider.createOrderClaimChain(req());
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

      it("createOrderClaimChain returns an array", async () => {
        const p = factory();
        const claims = await p.createOrderClaimChain(req());
        expect(Array.isArray(claims)).toBe(true);
        expect(claims.length).toBeGreaterThan(0);
      });

      it("verifyClaim returns valid + checks", async () => {
        const p = factory();
        const [claim] = await p.createOrderClaimChain(req());
        const result = await p.verifyClaim(claim);
        expect(typeof result.valid).toBe("boolean");
        expect(Array.isArray(result.checks)).toBe(true);
      });

      it("verifyClaimChain returns valid + checks + chainIntegrity", async () => {
        const p = factory();
        const claims = await p.createOrderClaimChain(req());
        const result = await p.verifyClaimChain(claims);
        expect(typeof result.valid).toBe("boolean");
        expect(typeof result.chainIntegrity).toBe("boolean");
        expect(Array.isArray(result.checks)).toBe(true);
      });
    });
  }
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
});
