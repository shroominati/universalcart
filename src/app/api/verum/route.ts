import { NextRequest, NextResponse } from "next/server";
import { getVerumMode } from "@/lib/verum";
import { getVerumProvider } from "@/lib/verum/server-provider";
import { VerumClaim } from "@/lib/types";

function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const provider = getVerumProvider();

  switch (action) {
    case "create-order-chain": {
      const { vendorDid, orderId } = body;
      if (!vendorDid) {
        return withCors(
          NextResponse.json({ error: "vendorDid is required" }, { status: 400 })
        );
      }
      const result = await provider.createOrderClaimChain({
        vendorDid,
        orderId: orderId ?? "unknown",
      });
      return withCors(NextResponse.json(result));
    }

    case "verify-claim": {
      const { claim } = body as { claim: VerumClaim };
      if (!claim) {
        return withCors(
          NextResponse.json({ error: "claim is required" }, { status: 400 })
        );
      }
      const result = await provider.verifyClaim(claim);
      return withCors(NextResponse.json(result));
    }

    case "verify-chain": {
      const { claims } = body as { claims: VerumClaim[] };
      if (!claims?.length) {
        return withCors(
          NextResponse.json(
            { error: "claims array is required" },
            { status: 400 }
          )
        );
      }
      const result = await provider.verifyClaimChain(claims);
      return withCors(NextResponse.json(result));
    }

    case "inspect-claim": {
      const { claim } = body as { claim: VerumClaim };
      if (!claim) {
        return withCors(
          NextResponse.json({ error: "claim is required" }, { status: 400 })
        );
      }
      const result = await provider.inspectClaim(claim);
      return withCors(NextResponse.json(result));
    }

    case "status": {
      return withCors(
        NextResponse.json({
          mode: getVerumMode(),
          providerMode: provider.mode,
          capabilities: provider.capabilities,
        })
      );
    }

    default:
      return withCors(
        NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
      );
  }
}

export async function GET() {
  const mode = getVerumMode();
  const provider = getVerumProvider();
  return withCors(
    NextResponse.json({
      mode,
      providerMode: provider.mode,
      capabilities: provider.capabilities,
    })
  );
}
