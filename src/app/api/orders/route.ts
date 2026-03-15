import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message:
      "Orders are managed client-side via Zustand. " +
      "This endpoint is a placeholder for server-side order persistence.",
  });
}
