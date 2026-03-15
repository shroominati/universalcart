import { NextRequest, NextResponse } from "next/server";
import { getVerumProvider, getVerumMode } from "@/lib/verum";
import { VerumClaim } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const provider = getVerumProvider();

  switch (action) {
    case "create-order-chain": {
      const { vendorDid, orderId } = body;
      if (!vendorDid) {
        return NextResponse.json(
          { error: "vendorDid is required" },
          { status: 400 }
        );
      }
      const claims = await provider.createOrderClaimChain({
        vendorDid,
        orderId: orderId ?? "unknown",
      });
      return NextResponse.json({ claims, mode: provider.mode });
    }

    case "verify-claim": {
      const { claim } = body as { claim: VerumClaim };
      if (!claim) {
        return NextResponse.json(
          { error: "claim is required" },
          { status: 400 }
        );
      }
      const result = await provider.verifyClaim(claim);
      return NextResponse.json({ ...result, mode: provider.mode });
    }

    case "verify-chain": {
      const { claims } = body as { claims: VerumClaim[] };
      if (!claims?.length) {
        return NextResponse.json(
          { error: "claims array is required" },
          { status: 400 }
        );
      }
      const result = await provider.verifyClaimChain(claims);
      return NextResponse.json({ ...result, mode: provider.mode });
    }

    case "status": {
      return NextResponse.json({
        mode: getVerumMode(),
        providerMode: provider.mode,
      });
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}

export async function GET() {
  const mode = getVerumMode();
  const provider = getVerumProvider();
  return NextResponse.json({
    mode,
    providerMode: provider.mode,
  });
}
