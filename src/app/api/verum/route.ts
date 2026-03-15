import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIntentClaim,
  createVendorConfirmClaim,
  createFulfillmentClaim,
  createDeliveryConfirmClaim,
  verifyClaim,
  verifyClaimChain,
} from "@/lib/verum";
import { VerumClaim } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  switch (action) {
    case "create-payment-intent": {
      const claim = createPaymentIntentClaim();
      return NextResponse.json({ claim });
    }

    case "create-vendor-confirm": {
      const { vendorDid, paymentClaimHash } = body;
      const claim = createVendorConfirmClaim(vendorDid, paymentClaimHash);
      return NextResponse.json({ claim });
    }

    case "create-fulfillment": {
      const { vendorDid, orderClaimHash } = body;
      const claim = createFulfillmentClaim(vendorDid, orderClaimHash);
      return NextResponse.json({ claim });
    }

    case "create-delivery-confirm": {
      const { confirmHash } = body;
      const claim = createDeliveryConfirmClaim(confirmHash);
      return NextResponse.json({ claim });
    }

    case "verify-claim": {
      const { claim } = body as { claim: VerumClaim };
      const result = verifyClaim(claim);
      return NextResponse.json(result);
    }

    case "verify-chain": {
      const { claims } = body as { claims: VerumClaim[] };
      const result = verifyClaimChain(claims);
      return NextResponse.json(result);
    }

    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
