// app/api/admin/hiring/list/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const url = new URL(req.url);

    // Query params
    const search = url.searchParams.get("search")?.toLowerCase() || "";
    const status = url.searchParams.get("status") || "all";
    const sort = url.searchParams.get("sort") || "newest"; // newest | oldest
    const page = Number(url.searchParams.get("page") || 1);
    const limit = Number(url.searchParams.get("limit") || 20);

    // Base query
    let queryRef = adminDb.collection("hiringForms");

    // Filter by status
    if (status !== "all") {
      queryRef = queryRef.where("status", "==", status);
    }

    // Sorting
    if (sort === "oldest") {
      queryRef = queryRef.orderBy("createdAt", "asc");
    } else {
      queryRef = queryRef.orderBy("createdAt", "desc");
    }

    // Fetch snapshot
    const snapshot = await queryRef.get();
    let items: any[] = [];
    snapshot.forEach((doc: any) => items.push({ id: doc.id, ...doc.data() }));

    // Apply search (client-side)
    if (search) {
      items = items.filter((item) => {
        const haystack =
          `${item.name} ${item.email} ${item.phone} ${item.skills}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    // Pagination
    const total = items.length;
    const start = (page - 1) * limit;
    const end = start + limit;

    const paginated = items.slice(start, end);

    return NextResponse.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      items: paginated,
    });
  } catch (err: any) {
    console.error("🔥 Admin hiring list error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
