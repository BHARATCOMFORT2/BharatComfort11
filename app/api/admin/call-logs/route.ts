export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ ADMIN TOKEN VERIFY
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

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid admin token" },
        { status: 401 }
      );
    }

    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN FROM FIRESTORE
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ BODY FILTERS
    const body = await req.json();
    const { from, to, staffId } = body || {};

    let fromDate: Date | null = from ? new Date(from) : null;
    let toDate: Date | null = to ? new Date(to) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    // ⚠️ NOTE: callLogs array "leads" me stored hai
    // Isliye hum leads fetch karke usme se callLogs flatten karenge

    let leadsQuery: FirebaseFirestore.Query = adminDb.collection("leads");

    // ✅ Optional staff filter (assignedTo)
    if (staffId) {
      leadsQuery = leadsQuery.where("assignedTo", "==", staffId);
    }

    // Optional: limit to avoid huge load
    leadsQuery = leadsQuery.orderBy("createdAt", "desc").limit(500);

    const leadsSnap = await leadsQuery.get();

    const callLogs: any[] = [];

    leadsSnap.docs.forEach((leadDoc) => {
      const lead = leadDoc.data();
      const leadId = leadDoc.id;

      const logs = (lead.callLogs || []) as any[];

      logs.forEach((log) => {
        // log.createdAt is Firestore Timestamp (from new Date())
        let createdAt: Date | null = null;

        if (log?.createdAt?.toDate) {
          createdAt = log.createdAt.toDate();
        } else if (log?.createdAt instanceof Date) {
          createdAt = log.createdAt;
        }

        // ✅ DATE FILTER (call time ke basis par)
        if (fromDate || toDate) {
          if (!createdAt) return;
          if (fromDate && createdAt < fromDate) return;
          if (toDate && createdAt > toDate) return;
        }

        callLogs.push({
          leadId,
          leadName: lead.name || "",
          businessName: lead.businessName || "",
          leadPhone: lead.phone || "",
          assignedTo: lead.assignedTo || null,

          phone: log.phone || lead.phone || "",
          outcome: log.outcome || "",
          note: log.note || "",
          calledBy: log.calledBy || "",
          createdAt: createdAt || null,
        });
      });
    });

    // ✅ Latest calls first
    callLogs.sort((a, b) => {
      const ta = a.createdAt ? a.createdAt.getTime() : 0;
      const tb = b.createdAt ? b.createdAt.getTime() : 0;
      return tb - ta;
    });

    return NextResponse.json({
      success: true,
      data: callLogs,
    });
  } catch (error: any) {
    console.error("ADMIN CALL LOGS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to fetch call logs",
      },
      { status: 500 }
    );
  }
}
