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
 * Known Verum CLI surface:
 *   verum step request -o <path> --secret-key <key>
 *   verum verify-chain <dir> --json
 *   verum verify-claim <file>
 *   verum inspect <file> --json
 *
 * Commerce claim types (payment.intent, vendor.order.confirmed, etc.) are
 * NOT in the Verum CLI step surface. See VERUM_INTERFACE_GAPS.md.
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
      "Verum CLI mode. The verum binary handles verification and " +
      "inspection where its command surface supports it. Commerce " +
      "claim types (payment.intent, vendor.order.confirmed) are not " +
      "yet in verum step — those claims are generated locally. " +
      "Warnings surface every gap explicitly.",
  };

  constructor() {
    this.cliPath = getVerumCliPath();
  }

  private async isAvailable(): Promise<boolean> {
    if (this._available !== null) return this._available;
    try {
      const { code } = await exec(this.cliPath, ["--version"]);
      this._available = code === 0;
    } catch {
      this._available = false;
    }
    if (this._available) {
      (this.capabilities as VerumProviderCapabilities).inspectClaims = true;
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
        "Commerce claim types (payment.intent, vendor.order.confirmed) are " +
          "not supported by verum CLI step commands. Using simulated claims. " +
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
        "verum verify-claim requires a file path (no stdin JSON mode). " +
          "Using simulated verification. See VERUM_INTERFACE_GAPS.md."
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
        "verum verify-chain requires a directory of claim files. " +
          "Using simulated verification. See VERUM_INTERFACE_GAPS.md."
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
        "verum inspect requires a file path. Using local inspection."
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
