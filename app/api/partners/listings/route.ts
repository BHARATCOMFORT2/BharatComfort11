// app/api/partners/listings/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // ✅ Forward partner listings request to unified API
  return NextResponse.redirect(new URL("/api/listings", req.url));
}
