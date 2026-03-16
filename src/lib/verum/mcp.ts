import { VerumClaim } from "../types";
import {
  VerumProvider,
  VerumProviderCapabilities,
  CreateClaimChainRequest,
  OrderClaimChainResult,
  ClaimVerificationResult,
  ChainVerificationResult,
  ClaimInspectionResult,
  CLAIM_TYPE_LABELS,
} from "./provider";
import { getVerumMcpCommand, getVerumMcpArgs } from "./config";
import { MockVerumProvider } from "./mock";

/**
 * McpVerumProvider connects to a running verum-mcp-server instance.
 *
 * Server-only. The verum-mcp-server uses stdio transport (stdin/stdout
 * JSON-RPC per the MCP protocol). There is no HTTP endpoint — a proper
 * MCP client library or stdio bridge is needed.
 *
 * Every fallback to mock produces an explicit warning in the result so
 * the UI can inform the user — no silent degradation.
 *
 * Current MCP tools (all procurement-specific):
 *   verum.procurement.request
 *   verum.procurement.evaluate
 *   verum.procurement.budget_check
 *   verum.procurement.approve
 *   verum.procurement.verify_chain
 *
 * Commerce claim types are not in the current MCP tool surface.
 * See VERUM_INTERFACE_GAPS.md.
 */

export class McpVerumProvider implements VerumProvider {
  readonly mode = "mcp" as const;
  private fallback = new MockVerumProvider();
  private mcpCommand: string;
  private mcpArgs: string[];
  private _available: boolean | null = null;

  readonly capabilities: VerumProviderCapabilities = {
    generateClaims: false,
    verifyClaims: false,
    inspectClaims: false,
    explainMode:
      "Verum MCP mode. The verum-mcp-server exposes 5 procurement " +
      "tools over stdio JSON-RPC — commerce claim types are not " +
      "yet in that surface. All operations use local simulation " +
      "until the MCP tool registry includes commerce types. " +
      "Warnings surface every gap explicitly.",
  };

  constructor() {
    this.mcpCommand = getVerumMcpCommand();
    this.mcpArgs = getVerumMcpArgs();
  }

  private async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    try {
      const { execFile } = await import("child_process");
      const { promisify } = await import("util");
      const execFileAsync = promisify(execFile);
      await execFileAsync(this.mcpCommand, ["--help"], { timeout: 5_000 });
      this._available = true;
    } catch {
      this._available = false;
    }
    return this._available;
  }

  async createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<OrderClaimChainResult> {
    const warnings: string[] = [];
    const available = await this.isAvailable();

    if (!available) {
      warnings.push(
        `verum-mcp-server not found ("${this.mcpCommand}"). Using simulated claims.`
      );
    } else {
      warnings.push(
        "Commerce claim types (payment.intent, vendor.order.confirmed) " +
          "are not in the current MCP tool surface. The server exposes " +
          "procurement tools only. Using simulated claims. " +
          "See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.createOrderClaimChain(req);
    return { mode: "mcp", claims: mock.claims, warnings };
  }

  async verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `verum-mcp-server not found ("${this.mcpCommand}"). Using simulated verification.`
      );
    } else {
      warnings.push(
        "verum-mcp-server uses stdio transport (no HTTP endpoint). " +
          "Using simulated verification. See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.verifyClaim(claim);
    return { ...mock, mode: "mcp", warnings };
  }

  async verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `verum-mcp-server not found ("${this.mcpCommand}"). Using simulated verification.`
      );
    } else {
      warnings.push(
        "verum.procurement.verify_chain is procurement-specific. " +
          "Commerce chain verification not supported. Using simulated verification. " +
          "See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.verifyClaimChain(claims);
    return { ...mock, mode: "mcp", warnings };
  }

  async inspectClaim(claim: VerumClaim): Promise<ClaimInspectionResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `verum-mcp-server not found ("${this.mcpCommand}"). Using local inspection.`
      );
    } else {
      warnings.push(
        "No MCP tool for claim inspection. Using local inspection."
      );
    }

    return {
      mode: "mcp",
      claimType: CLAIM_TYPE_LABELS[claim.type] ?? claim.type,
      issuer: claim.issuer,
      contentHash: claim.contentHash,
      dependencies: claim.envelope?.dependencies ?? [],
      verificationStatus:
        claim.status === "valid" ? "valid (simulated)" : claim.status,
      warnings,
    };
  }
}
