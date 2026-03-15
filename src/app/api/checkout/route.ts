import { NextRequest, NextResponse } from "next/server";
import {
  createPaymentIntentClaim,
  createVendorConfirmClaim,
} from "@/lib/verum";
import { getVendor } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { vendorIds } = (await req.json()) as { vendorIds: string[] };

  const results = vendorIds.map((vendorId) => {
    const vendor = getVendor(vendorId);
    if (!vendor) {
      return { vendorId, error: "Vendor not found" };
    }

    const paymentClaim = createPaymentIntentClaim();
    const vendorConfirm = createVendorConfirmClaim(
      vendor.verumDid,
      paymentClaim.contentHash
    );

    return {
      vendorId,
      claims: [paymentClaim, vendorConfirm],
    };
  });

  return NextResponse.json({ vendorOrders: results });
}
