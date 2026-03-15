import { VerumClaim } from "../types";
import {
  VerumProvider,
  CreateClaimChainRequest,
  ClaimVerificationResult,
  ChainVerificationResult,
  VerificationCheck,
} from "./provider";
import { getVerumCliPath } from "./config";
import { MockVerumProvider } from "./mock";

/**
 * CliVerumProvider shells out to the `verum` CLI binary.
 *
 * Server-only: relies on child_process which is unavailable in browser.
 *
 * If the binary is missing or returns an unexpected shape, every method
 * falls back to MockVerumProvider and tags the result so the UI can
 * distinguish degraded operation.
 *
 * Known Verum CLI surface used:
 *   verum step request   -o <path> --secret-key <key>
 *   verum step evaluate  -o <path> ...
 *   verum verify-chain   <dir> --json
 *   verum verify-claim   <file> --json
 *
 * Integration gaps surfaced here rather than patching Verum:
 *   - verum step request does not accept a JSON body on stdin; we write
 *     temp files and pass paths.
 *   - verum verify-chain --json outputs a summary, but the exact shape
 *     is not documented in a JSON-Schema. We parse defensively.
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
    return this._available;
  }

  async createOrderClaimChain(
    req: CreateClaimChainRequest
  ): Promise<VerumClaim[]> {
    if (!(await this.isAvailable())) {
      console.warn(
        `[verum/cli] verum binary not found at "${this.cliPath}". Falling back to mock.`
      );
      return this.fallback.createOrderClaimChain(req);
    }

    // GAP: verum CLI does not currently expose a single "create order chain"
    // command that accepts vendor DID and returns JSON claims on stdout.
    // The closest path is `verum step request` + `verum step evaluate`, but
    // those are procurement-specific and write to files.
    //
    // Until Verum exposes a commerce-oriented step or a generic
    // `verum step custom --type payment.intent --issuer <did> --json`,
    // we fall back to mock with a clear log.
    console.warn(
      "[verum/cli] Commerce claim types (payment.intent, vendor.order.confirmed) " +
        "are not yet supported by verum CLI step commands. Using mock claims. " +
        "See VERUM_INTERFACE_GAPS.md for details."
    );
    return this.fallback.createOrderClaimChain(req);
  }

  async verifyClaim(claim: VerumClaim): Promise<ClaimVerificationResult> {
    if (!(await this.isAvailable())) {
      return this.fallback.verifyClaim(claim);
    }

    // GAP: verum verify-claim expects a file path, not stdin JSON.
    // We would need to write a temp file. For now, fall back.
    return this.fallback.verifyClaim(claim);
  }

  async verifyClaimChain(
    claims: VerumClaim[]
  ): Promise<ChainVerificationResult> {
    if (!(await this.isAvailable())) {
      return this.fallback.verifyClaimChain(claims);
    }

    // GAP: verum verify-chain expects a directory of claim files.
    // Bridging requires writing claims to a temp dir and running
    // `verum verify-chain <tmpdir> --json`. Feasible but not yet wired.
    return this.fallback.verifyClaimChain(claims);
  }
}
