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
import { getVerumCliPath } from "./config";
import { MockVerumProvider } from "./mock";

/**
 * CliVerumProvider shells out to the `verum` CLI binary.
 *
 * Server-only: relies on child_process which is unavailable in browser.
 *
 * Every fallback to mock produces an explicit warning in the result so the
 * UI can inform the user — no silent degradation.
 *
 * Current Verum CLI surface (observed locally on 2026-03-15):
 *   verum verify-chain --json <paths...>
 *   verum verify-claim --json <file>
 *   verum inspect --json <file>
 *   verum step {request,evaluate,budget-check,approve}
 *   verum generate-chain --json
 *
 * The current blocker is not the presence of verify/inspect commands.
 * It is that UniversalCart still emits a legacy ClaimEnvelopeV1 commerce
 * shape, while the current Verum build expects its native JSON schema
 * (`version`, `claim_type`, `payload`, `proof`, ...) and procurement claim
 * types. See VERUM_INTERFACE_GAPS.md.
 */

async function exec(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, {
      timeout: 15_000,
    });
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? String(err),
      code: e.code ?? 1,
    };
  }
}

export class CliVerumProvider implements VerumProvider {
  readonly mode = "cli" as const;
  private fallback = new MockVerumProvider();
  private cliPath: string;
  private _available: boolean | null = null;

  readonly capabilities: VerumProviderCapabilities = {
    generateClaims: false,
    verifyClaims: false,
    inspectClaims: false,
    explainMode:
      "Verum CLI mode. The installed verum binary can generate, inspect, " +
      "and verify native Verum procurement claims, but UniversalCart still " +
      "emits legacy ClaimEnvelopeV1 commerce claims that the current CLI " +
      "cannot parse or generate. Warnings surface that schema mismatch " +
      "explicitly and operations fall back to local simulation.",
  };

  constructor() {
    this.cliPath = getVerumCliPath();
  }

  private async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    try {
      const { code } = await exec(this.cliPath, ["--help"]);
      this._available = code === 0;
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
        `Verum CLI not found at "${this.cliPath}". Using simulated claims.`
      );
    } else {
      warnings.push(
        "Current verum can generate native procurement chains, but it still " +
          "does not expose commerce claim generation for payment.intent or " +
          "vendor.order.confirmed, and it expects a different JSON schema " +
          "than UniversalCart's ClaimEnvelopeV1. Using simulated claims. " +
          "See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.createOrderClaimChain(req);
    return { mode: "cli", claims: mock.claims, warnings };
  }

  async verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `Verum CLI not found at "${this.cliPath}". Using simulated verification.`
      );
    } else {
      warnings.push(
        "Current verum can verify native claim JSON files via verify-claim, " +
          "but UniversalCart claims still use the legacy ClaimEnvelopeV1 " +
          "commerce schema instead of the CLI's native version/claim_type/" +
          "payload/proof format. Using simulated verification. " +
          "See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.verifyClaim(claim);
    return { ...mock, mode: "cli", warnings };
  }

  async verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `Verum CLI not found at "${this.cliPath}". Using simulated verification.`
      );
    } else {
      warnings.push(
        "Current verum can verify native claim files or directories via " +
          "verify-chain, but UniversalCart claims still use the legacy " +
          "ClaimEnvelopeV1 commerce schema instead of the CLI's native " +
          "version/claim_type/payload/proof format. Using simulated " +
          "verification. See VERUM_INTERFACE_GAPS.md."
      );
    }

    const mock = await this.fallback.verifyClaimChain(claims);
    return { ...mock, mode: "cli", warnings };
  }

  async inspectClaim(claim: VerumClaim): Promise<ClaimInspectionResult> {
    const warnings: string[] = [];

    if (!(await this.isAvailable())) {
      warnings.push(
        `Verum CLI not found at "${this.cliPath}". Using local inspection.`
      );
    } else {
      warnings.push(
        "Current verum can inspect native claim JSON files via inspect --json, " +
          "but UniversalCart claims still use the legacy ClaimEnvelopeV1 " +
          "commerce schema instead of the CLI's native version/claim_type/" +
          "payload/proof format. Using local inspection. " +
          "See VERUM_INTERFACE_GAPS.md."
      );
    }

    return {
      mode: "cli",
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
