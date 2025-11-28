// app/api/admin/leads/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params?.id;

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead ID is required",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: leadSnap.id,
        ...leadSnap.data(),
      },
    });
  } catch (error: any) {
    console.error("Single lead fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lead details",
      },
      { status: 500 }
    );
  }
}
