// app/api/admin/leads/all/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const snapshot = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .get();

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("Admin all leads fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch all leads",
      },
      { status: 500 }
    );
  }
}
