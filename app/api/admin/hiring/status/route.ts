// app/api/admin/hiring/status/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Body:
 * {
 *   id: string,
 *   newStatus: string,
 *   adminNotes?: string,
 *   notify?: boolean
 * }
 */

export async function POST(req: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const body = await req.json();

    const { id, newStatus, adminNotes = "", notify = false } = body;

    if (!id || !newStatus)
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );

    const validStatuses = [
      "pending",
      "reviewing",
      "shortlisted",
      "rejected",
      "hired",
      "deleted",
    ];

    if (!validStatuses.includes(newStatus))
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );

    /** 🔍 Try both common collection names */
    const collections = ["applications", "hiringForms"];
    let docRef: FirebaseFirestore.DocumentReference | null = null;

    for (const col of collections) {
      const ref = adminDb.collection(col).doc(id);
      const snap = await ref.get();
      if (snap.exists) {
        docRef = ref;
        break;
      }
    }

    if (!docRef)
      return NextResponse.json(
        { success: false, error: "Applicant not found" },
        { status: 404 }
      );

    const snap = await docRef.get();
    const oldData = snap.data() || {};

    /** 🕒 Build history entry */
    const historyEntry = {
      action: newStatus,
      message: adminNotes || "",
      timestamp: new Date(),
      by: "admin",
    };

    const oldHistory = Array.isArray(oldData.statusHistory)
      ? oldData.statusHistory
      : [];

    /** 🔄 Update document */
    await docRef.update({
      status: newStatus,
      adminNotes,
      statusHistory: [...oldHistory, historyEntry],
    });

    /** 📧 Optional email notification */
    if (notify && oldData.email) {
      try {
        // TODO: integrate with your email provider if available
        console.log(
          `Mock email sent to ${oldData.email} about status ${newStatus}`
        );
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Status update error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
