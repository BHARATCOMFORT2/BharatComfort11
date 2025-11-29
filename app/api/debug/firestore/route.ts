export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const { adminDb } = getFirebaseAdmin();

    const snap = await adminDb.collection("listings").get();

    return NextResponse.json({
      success: true,
      firestoreProject: adminDb.app.options.projectId,
      totalDocsInListings: snap.size,
    });
  } catch (err: any) {
    console.error("Debug Firestore Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
