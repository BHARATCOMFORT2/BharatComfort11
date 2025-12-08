// app/api/partners/listings/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "20";

    const authHeader = req.headers.get("authorization"); // ✅ HEADER COPY

    const targetUrl = new URL(
      `/api/partners/listings/list?page=${page}&limit=${limit}`,
      url.origin
    );

    const res = await fetch(targetUrl.toString(), {
      headers: {
        Authorization: authHeader || "",
      },
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("partner listings proxy error:", err);
    return NextResponse.json(
      { error: "Partner listings proxy failed" },
      { status: 500 }
    );
  }
}
