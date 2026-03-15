import { VerumClaim } from "../types";
import {
  VerumProvider,
  CreateClaimChainRequest,
  ClaimVerificationResult,
  ChainVerificationResult,
} from "./provider";
import { getVerumMcpUrl } from "./config";
import { MockVerumProvider } from "./mock";

/**
 * McpVerumProvider connects to a running verum-mcp-server instance.
 *
 * Server-only: makes HTTP requests to the MCP server.
 *
 * The verum-mcp-server exposes 5 procurement tools over stdio:
 *   verum.procurement.request
 *   verum.procurement.evaluate
 *   verum.procurement.budget_check
 *   verum.procurement.approve
 *   verum.procurement.verify_chain
 *
 * Integration gaps:
 *   - verum-mcp-server uses stdio transport (stdin/stdout JSON-RPC), not HTTP.
 *     A thin HTTP wrapper or an MCP client library would be needed to bridge.
 *   - The procurement tools map to compliance/approval workflows, not commerce
 *     order flows. Commerce claim types (payment.intent, vendor.order.confirmed)
 *     are not in the current MCP tool surface.
 *
 * If the MCP server is unreachable, all methods fall back to MockVerumProvider.
 */

export class McpVerumProvider implements VerumProvider {
  readonly mode = "mcp" as const;
  private fallback = new MockVerumProvider();
  private mcpUrl: string;
  private _available: boolean | null = null;

  constructor() {
    this.mcpUrl = getVerumMcpUrl();
  }

  private async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.mcpUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      this._available = res.ok;
    } catch {
      this._available = false;
    }
    return this._available;
  }

  async createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<VerumClaim[]> {
    if (!(await this.isAvailable())) {
      console.warn(
        `[verum/mcp] MCP server unreachable at ${this.mcpUrl}. Falling back to mock.`
      );
      return this.fallback.createOrderClaimChain(req);
    }

    // GAP: verum-mcp-server exposes procurement tools, not commerce order tools.
    // The current tool surface is:
    //   verum.procurement.request / evaluate / budget_check / approve / verify_chain
    //
    // Commerce claim types (payment.intent, vendor.order.confirmed) would need
    // new MCP tool registrations in the Verum repo. Until then, fall back.
    console.warn(
      "[verum/mcp] Commerce claim types are not in the current MCP tool surface. " +
        "Using mock claims. See VERUM_INTERFACE_GAPS.md for details."
    );
    return this.fallback.createOrderClaimChain(req);
  }

  async verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult> {
    if (!(await this.isAvailable())) {
      return this.fallback.verifyClaim(claim);
    }
    return this.fallback.verifyClaim(claim);
  }

  async verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult> {
    if (!(await this.isAvailable())) {
      return this.fallback.verifyClaimChain(claims);
    }
    return this.fallback.verifyClaimChain(claims);
  }
}
