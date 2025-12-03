export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const snap = await adminDb
      .collection("partnerLeads")
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
    console.error("ADMIN PARTNER LEADS API ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch partner leads",
      },
      { status: 500 }
    );
  }
}
