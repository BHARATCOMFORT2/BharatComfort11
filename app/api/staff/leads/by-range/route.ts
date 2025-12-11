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

// ✅ IST DATE HELPER
function getISTNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

// ✅ Convert Firestore Timestamp / Date / string → JS Date
function toJSDate(val: any): Date | null {
  try {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val?.toDate) return val.toDate();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ✅ Date bucket helpers (IST SAFE)
function isToday(d: Date, now: Date) {
  return d.toDateString() === now.toDateString();
}

function isYesterday(d: Date, now: Date) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function isThisWeek(d: Date, now: Date) {
  const diff = now.getTime() - d.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function isThisMonth(d: Date, now: Date) {
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    const body = await req.json().catch(() => ({}));
    const { range } = body || {};

    // ✅ VERIFY STAFF
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
    if (!staffSnap.exists)
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );

    const staff = staffSnap.data();
    if (
      staff?.role !== "telecaller" ||
      staff?.status !== "approved" ||
      staff?.isActive !== true
    )
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );

    // ✅ FETCH ALL ASSIGNED TASKS
    const snapshot = await adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .get();

    const now = getISTNow();

    const todayTasks: any[] = [];
    const yesterdayTasks: any[] = [];
    const weekTasks: any[] = [];
    const monthTasks: any[] = [];

    snapshot.forEach((docSnap) => {
      const d = docSnap.data();

      // ✅ ✅ ✅ TASK DATE = ASSIGN > FOLLOWUP > CREATED
      const assigned = toJSDate(d.assignedAt);
      const followup = toJSDate(d.followupDate);
      const created = toJSDate(d.createdAt);

      const taskDate = assigned || followup || created;
      if (!taskDate) return;

      const task = {
        id: docSnap.id,
        name: d.name || "",
        businessName: d.businessName || "",
        contactPerson: d.contactPerson || "",
        phone: d.phone || d.mobile || d.contact || "",
        email: d.email || "",
        city: d.city || "",
        address: d.address || d.location || "",
        category: d.category || "",
        status: d.status || "new",
        followupDate: d.followupDate || "",
        adminNote: d.adminNote || "",
        partnerNotes: d.partnerNotes || "",
        lastCalledAt: d.lastCalledAt || null,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
        lastUpdatedBy: d.lastUpdatedBy || null,
      };

      if (isToday(taskDate, now)) todayTasks.push(task);
      if (isYesterday(taskDate, now)) yesterdayTasks.push(task);
      if (isThisWeek(taskDate, now)) weekTasks.push(task);
      if (isThisMonth(taskDate, now)) monthTasks.push(task);
    });

    // ✅ SINGLE RANGE RESPONSE
    if (range === "today")
      return NextResponse.json({ success: true, tasks: todayTasks });
    if (range === "yesterday")
      return NextResponse.json({ success: true, tasks: yesterdayTasks });
    if (range === "week")
      return NextResponse.json({ success: true, tasks: weekTasks });
    if (range === "month")
      return NextResponse.json({ success: true, tasks: monthTasks });

    // ✅ SUMMARY (SIDEBAR)
    return NextResponse.json({
      success: true,
      summary: {
        today: todayTasks,
        yesterday: yesterdayTasks,
        week: weekTasks,
        month: monthTasks,
      },
    });
  } catch (err) {
    console.error("❌ staff leads by-range error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load telecaller tasks" },
      { status: 500 }
    );
  }
}
