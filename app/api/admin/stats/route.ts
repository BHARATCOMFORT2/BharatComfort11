import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 📊 GET /api/admin/stats
 * Returns total counts of users, partners, listings, and staffs
 */
export async function GET() {
  try {
    const { adminDb } = getFirebaseAdmin();

    const collections = ["users", "partners", "listings", "staffs"];
    const counts: Record<string, number> = {};

    // Run all counts in parallel
    await Promise.all(
      collections.map(async (col) => {
        const snap = await adminDb.collection(col).count().get();
        counts[col] = snap.data()?.count || 0;
      })
    );

    return NextResponse.json({
      success: true,
      stats: {
        users: counts["users"] || 0,
        partners: counts["partners"] || 0,
        listings: counts["listings"] || 0,
        staffs: counts["staffs"] || 0,
      },
    });
  } catch (err: any) {
    console.error("🔥 Error fetching admin stats:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
