export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* ---------------------------------------
   HELPERS
---------------------------------------- */

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

// ✅ IST now
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

/* ---------------------------------------
   CORE HANDLER (SHARED)
---------------------------------------- */
async function handleRequest(
  req: Request,
  params: { range?: string; fromDate?: string; toDate?: string }
) {
  /* -----------------------------------
     AUTH
  ------------------------------------ */
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

  /* -----------------------------------
     STAFF VERIFY
  ------------------------------------ */
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

  const { range, fromDate, toDate } = params;

  /* -----------------------------------
     FETCH LEADS (🔥 FIXED FIELD)
  ------------------------------------ */
  const snapshot = await adminDb
    .collection("leads")
    .where("assignedTo", "==", staffId)
    .get();

  const now = getISTNow();

  const todayLeads: any[] = [];
  const yesterdayLeads: any[] = [];
  const weekLeads: any[] = [];
  const monthLeads: any[] = [];
  const lastMonthLeads: any[] = [];
  const customLeads: any[] = [];
  const allLeads: any[] = [];

  const customFrom = fromDate ? new Date(fromDate) : null;
  const customTo = toDate ? new Date(toDate) : null;

  const lastMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0
  );

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();

    const assigned = toJSDate(d.assignedAt);
    const followup = toJSDate(d.followupDate);
    const created = toJSDate(d.createdAt);

    const taskDate = assigned || followup || created;
    if (!taskDate) return;

    const lead = {
      id: docSnap.id,
      name: d.name || "",
      businessName: d.businessName || "",
      phone: d.phone || d.mobile || "",
      email: d.email || "",
      city: d.city || "",
      status: d.status || "new",
      followupDate: d.followupDate || "",
      lastCalledAt: d.lastCalledAt || null,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null,
    };

    allLeads.push(lead);

    if (isToday(taskDate, now)) todayLeads.push(lead);
    if (isYesterday(taskDate, now)) yesterdayLeads.push(lead);
    if (isThisWeek(taskDate, now)) weekLeads.push(lead);
    if (isThisMonth(taskDate, now)) monthLeads.push(lead);

    if (taskDate >= lastMonthStart && taskDate <= lastMonthEnd) {
      lastMonthLeads.push(lead);
    }

    if (
      range === "custom" &&
      customFrom &&
      customTo &&
      taskDate >= customFrom &&
      taskDate <= customTo
    ) {
      customLeads.push(lead);
    }
  });

  /* -----------------------------------
     RESPONSE (🔥 FIXED KEY = leads)
  ------------------------------------ */
  switch (range) {
    case "today":
      return NextResponse.json({ success: true, leads: todayLeads });
    case "yesterday":
      return NextResponse.json({ success: true, leads: yesterdayLeads });
    case "week":
      return NextResponse.json({ success: true, leads: weekLeads });
    case "month":
      return NextResponse.json({ success: true, leads: monthLeads });
    case "last_month":
      return NextResponse.json({ success: true, leads: lastMonthLeads });
    case "custom":
      return NextResponse.json({ success: true, leads: customLeads });
    case "all":
      return NextResponse.json({ success: true, leads: allLeads });
  }

  return NextResponse.json({ success: true, leads: todayLeads });
}

/* ---------------------------------------
   GET SUPPORT (🔥 FIXED 405)
---------------------------------------- */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return await handleRequest(req, {
      range: searchParams.get("range") || "today",
      fromDate: searchParams.get("from") || undefined,
      toDate: searchParams.get("to") || undefined,
    });
  } catch (err) {
    console.error("❌ staff leads GET error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load telecaller leads" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------
   POST SUPPORT
---------------------------------------- */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return await handleRequest(req, body || {});
  } catch (err) {
    console.error("❌ staff leads POST error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to load telecaller leads" },
      { status: 500 }
    );
  }
}
