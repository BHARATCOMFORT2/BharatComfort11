// app/api/admin/hiring/schedule/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Body:
 * {
 *   id: string,
 *   datetime: "2025-02-08T14:30",
 *   notes: string
 * }
 */

export async function POST(req: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const body = await req.json();

    const { id, datetime, notes = "" } = body;

    if (!id || !datetime) {
      return NextResponse.json(
        { success: false, error: "Missing id or datetime" },
        { status: 400 }
      );
    }

    /** Parse datetime */
    const dt = new Date(datetime);
    if (isNaN(dt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid datetime format" },
        { status: 400 }
      );
    }

    /** Find applicant in both possible collections */
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

    if (!docRef) {
      return NextResponse.json(
        { success: false, error: "Applicant not found" },
        { status: 404 }
      );
    }

    const snap = await docRef.get();
    const data = snap.data() || {};

    /** Create a history entry */
    const historyEntry = {
      action: "interview_scheduled",
      by: "admin",
      message: notes,
      timestamp: new Date(),
      interviewDateTime: dt.toISOString(),
    };

    const oldHistory = Array.isArray(data.statusHistory)
      ? data.statusHistory
      : [];

    /** Update applicant */
    await docRef.update({
      interview: {
        scheduled: true,
        datetime: dt.toISOString(),
        notes,
      },
      statusHistory: [...oldHistory, historyEntry],
    });

    /** Optional email notification (mock) */
    if (data.email) {
      console.log(
        `Mock email: Interview scheduled for ${data.email} at ${dt.toISOString()}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Interview schedule API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
