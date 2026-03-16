import { NextRequest, NextResponse } from "next/server";
import { lookupPublicPromoSuggestions } from "@/lib/promos/public-lookup";

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
  const body = (await req.json()) as {
    stores?: Array<{ domain?: string; vendorName?: string }>;
  };

  const stores = (body.stores || []).reduce<
    Array<{ domain: string; vendorName?: string }>
  >((acc, store) => {
    const domain = store.domain?.trim().toLowerCase();
    if (!domain) return acc;
    acc.push({
      domain,
      vendorName: store.vendorName?.trim() || undefined,
    });
    return acc;
  }, []).slice(0, 6);

  if (stores.length === 0) {
    return withCors(
      NextResponse.json(
        { error: "stores with domain values are required" },
        { status: 400 }
      )
    );
  }

  const results = await Promise.all(
    stores.map(async (store) => {
      const result = await lookupPublicPromoSuggestions(store);
      return {
        domain: store.domain,
        vendorName: store.vendorName || store.domain,
        query: result.query,
        suggestions: result.suggestions,
        warnings: result.warnings,
      };
    })
  );

  return withCors(
    NextResponse.json({
      lookedUpAt: new Date().toISOString(),
      results,
      suggestions: results.flatMap((result) => result.suggestions),
      warnings: [...new Set(results.flatMap((result) => result.warnings))],
    })
  );
}

export async function GET() {
  return withCors(
    NextResponse.json({
      status: "ok",
      supports: ["public-lookup"],
    })
  );
}
