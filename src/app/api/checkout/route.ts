import { NextRequest, NextResponse } from "next/server";
import { getVerumProvider } from "@/lib/verum";
import { getVendor } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { vendorIds } = (await req.json()) as { vendorIds: string[] };
  const provider = getVerumProvider();

  const results = await Promise.all(
    vendorIds.map(async (vendorId) => {
      const vendor = getVendor(vendorId);
      if (!vendor) {
        return { vendorId, error: "Vendor not found", claims: [] };
      }

      const claims = await provider.createOrderClaimChain({
        vendorDid: vendor.verumDid,
        orderId: `order-${vendorId}`,
      });

      return { vendorId, claims };
    })
  );

  return NextResponse.json({
    vendorOrders: results,
    mode: provider.mode,
  });
}
