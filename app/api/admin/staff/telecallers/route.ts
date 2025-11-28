// app/api/admin/staff/telecallers/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const snapshot = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const staffList = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      email: doc.data().email,
    }));

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error: any) {
    console.error("Admin telecaller list fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch telecallers list",
      },
      { status: 500 }
    );
  }
}
