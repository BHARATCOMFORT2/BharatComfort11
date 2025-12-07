// app/api/partners/listings/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // ✅ SAME request ko proper partner list API par forward karo
    const url = new URL(req.url);

    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "20";

    const target = new URL(
      `/api/partners/listings/list?page=${page}&limit=${limit}`,
      url.origin
    );

    return NextResponse.redirect(target);
  } catch (err: any) {
    console.error("partner listings redirect error:", err);
    return NextResponse.json(
      { error: "Partner listings redirect failed" },
      { status: 500 }
    );
  }
}
