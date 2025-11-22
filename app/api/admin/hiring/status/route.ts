// app/api/admin/hiring/status/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { sendStatusChangeEmail } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, newStatus, adminNotes = "", notify = false } = body;

    if (!id || !newStatus) {
      return NextResponse.json(
        { error: "Missing 'id' or 'newStatus'" },
        { status: 400 }
      );
    }

    const { adminDb } = getFirebaseAdmin();

    const docRef = adminDb.collection("hiringForms").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const applicant = snap.data();

    // Prepare update object
    const updateData: any = {
      status: newStatus,
      adminNotes,
      updatedAt: new Date(),
      statusHistory: [
        ...((applicant.statusHistory as any[]) || []),
        {
          status: newStatus,
          timestamp: new Date(),
          message: adminNotes || "Status updated",
        },
      ],
    };

    // Update Firestore
    await docRef.update(updateData);

    // Notify applicant via email ONLY if admin enables
    if (notify && applicant.email) {
      await sendStatusChangeEmail({
        to: applicant.email,
        applicantName: applicant.name,
        newStatus,
        notes: adminNotes,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Status update error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
