// ✅ Force Node.js runtime and dynamic execution
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 📊 GET /api/admin/stats
 * Returns total counts of users, partners, listings, and staffs
 * Safely handles Firebase Admin initialization in Netlify serverless.
 */
export async function GET() {
  try {
    const { adminDb } = getFirebaseAdmin();

    // ✅ Safety check to avoid undefined Firestore instance
    if (!adminDb || typeof adminDb.collection !== "function") {
      throw new Error("❌ Firestore Admin not initialized. Check firebaseadmin.ts and env vars.");
    }

    // Define collections to count
    const collections = ["users", "partners", "listings", "staffs"];
    const counts: Record<string, number> = {};

    // Run all counts in parallel using Firestore aggregate count API
    await Promise.all(
      collections.map(async (col) => {
        try {
          const snap = await adminDb.collection(col).count().get();
          counts[col] = snap.data()?.count || 0;
        } catch (innerErr: any) {
          console.warn(`⚠️ Skipping count for ${col}:`, innerErr.message);
          counts[col] = 0;
        }
      })
    );

    // Return the stats summary
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
    console.error("🔥 Error fetching admin stats:", err.message || err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load stats" },
      { status: 500 }
    );
  }
}
