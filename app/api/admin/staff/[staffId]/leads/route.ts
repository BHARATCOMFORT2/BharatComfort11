import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------
   HELPERS
---------------------------------------- */
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/* ---------------------------------------
   GET /admin/staff/:staffId/leads
---------------------------------------- */
export async function GET(
  req: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    /* -------------------------------
       1️⃣ AUTH (ADMIN ONLY)
    -------------------------------- */
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const adminUid = decoded.uid;

    const adminSnap = await adminDb.collection("staff").doc(adminUid).get();
    const adminData = adminSnap.exists ? adminSnap.data() : null;

    if (!adminData || !["admin", "superadmin"].includes(adminData.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    /* -------------------------------
       2️⃣ STAFF ID (FROM PARAM)
    -------------------------------- */
    const { staffId } = params;
    if (!staffId) {
      return NextResponse.json(
        { success: false, message: "staffId missing in URL" },
        { status: 400 }
      );
    }

    /* -------------------------------
       3️⃣ FETCH LEADS
    -------------------------------- */
    const snap = await adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .get();

    const now = new Date();

    let totalLeads = 0;
    let interested = 0;
    let callback = 0;
    let overdueCallback = 0;
    let totalNotes = 0;
    let totalCalls = 0;

    const leads: any[] = [];

    snap.forEach((doc) => {
      const d = doc.data();
      totalLeads++;

      if (d.status === "interested") interested++;
      if (d.status === "callback") {
        callback++;
        const f = toDate(d.followupDate);
        if (f && f < now) overdueCallback++;
      }

      const notesCount = Array.isArray(d.notes) ? d.notes.length : 0;
      const callsCount = Array.isArray(d.callLogs) ? d.callLogs.length : 0;

      totalNotes += notesCount;
      totalCalls += callsCount;

      leads.push({
        id: doc.id,
        name: d.name || "",
        businessName: d.businessName || "",
        phone: d.phone || d.mobile || "",
        status: d.status || "new",
        followupDate: d.followupDate || null,
        notesCount,
        callsCount,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
        lastNote: d.lastNote || null,
      });
    });

    /* -------------------------------
       4️⃣ SORT (LATEST ACTIVITY FIRST)
    -------------------------------- */
    leads.sort((a, b) => {
      const ta =
        toDate(a.updatedAt)?.getTime() ||
        toDate(a.createdAt)?.getTime() ||
        0;
      const tb =
        toDate(b.updatedAt)?.getTime() ||
        toDate(b.createdAt)?.getTime() ||
        0;
      return tb - ta;
    });

    /* -------------------------------
       5️⃣ RESPONSE
    -------------------------------- */
    return NextResponse.json({
      success: true,

      summary: {
        totalLeads,
        interested,
        callback,
        overdueCallback,
        totalNotes,
        totalCalls,
      },

      leads,
    });
  } catch (err) {
    console.error("❌ admin staff leads error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load staff leads" },
      { status: 500 }
    );
  }
}
