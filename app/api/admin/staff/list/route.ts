import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    // ✅ REAL STAFF COLLECTION
    const snap = await adminDb
      .collection("staff")
      .orderBy("createdAt", "desc")
      .get();

    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("Admin Staff List Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch staff list",
      },
      { status: 500 }
    );
  }
}
