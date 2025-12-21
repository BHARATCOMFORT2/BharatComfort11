// app/api/partners/listings/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get("page") || "1";
    const limit = url.searchParams.get("limit") || "20";

    // 🔑 forward cookies instead of auth header
    const cookie = req.headers.get("cookie") || "";

    const targetUrl = new URL(
      `/api/partners/listings/list?page=${page}&limit=${limit}`,
      url.origin
    );

    const res = await fetch(targetUrl.toString(), {
      headers: {
        cookie, // ✅ forward __session
      },
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("partner listings proxy error:", err);
    return NextResponse.json(
      { error: "Partner listings proxy failed" },
      { status: 500 }
    );
  }
}
