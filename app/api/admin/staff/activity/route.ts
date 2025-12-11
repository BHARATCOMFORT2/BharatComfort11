// app/api/admin/staff/activity/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/**
 * Request body (POST):
 * {
 *   staffId: string,        // REQUIRED (telecaller id)
 *   from?: string,         // ISO date
 *   to?: string,           // ISO date
 *   types?: string[]       // optional filter: ["note","call","status","log"]
 *   leadId?: string,       // optional, filter to one lead
 *   limit?: number,        // page size (default 100)
 *   cursor?: string        // optional: createdAt ISO or timestamp number for pagination (returns older than cursor)
 *   search?: string        // optional search in text/outcome/leadName
 * }
 *
 * Response:
 * { success:true, items: ActivityItem[], nextCursor: string|null }
 *
 * ActivityItem:
 * {
 *   id: string;           // unique id (leadId + type + ts)
 *   type: "note"|"call"|"status"|"log";
 *   staffId?: string;
 *   leadId: string;
 *   leadName?: string;
 *   text?: string;
 *   outcome?: string;
 *   status?: string;
 *   createdAt: string;    // ISO
 *   meta?: any;
 * }
 */

function getAuthHeader(req: Request) {
  return (req as any).headers?.get ? req.headers.get("authorization") : (req as any).headers?.authorization;
}

function toDateOrNull(v: any) {
  if (!v) return null;
  try {
    if (v.toDate) return v.toDate();
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader) return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });
    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) return NextResponse.json({ success: false, message: "Bad Authorization header" }, { status: 401 });

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const callerUid = decoded.uid;

    // check caller is admin / superadmin
    const callerSnap = await adminDb.collection("staff").doc(callerUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      staffId,
      from,
      to,
      types,
      leadId,
      limit = 100,
      cursor,
      search,
    } = body || {};

    if (!staffId) return NextResponse.json({ success: false, message: "staffId required" }, { status: 400 });

    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // normalize types filter
    let typeSet: Set<string> | null = null;
    if (Array.isArray(types) && types.length > 0) {
      typeSet = new Set(types);
    }

    // We'll collect items in array then sort+slice for pagination
    const items: any[] = [];

    // 1) Query leads assigned to staff (optionally filter by leadId)
    let leadsQuery = adminDb.collection("leads").where("assignedTo", "==", staffId);
    if (leadId) leadsQuery = leadsQuery.where(adminDb.collection("leads").doc().id ? "id" : "__name", "==", leadId); // fallback: we'll still filter client-side if needed

    const leadsSnap = await leadsQuery.get();

    // iterate leads and collect notes, callLogs, status updates and logs subcollection
    for (const leadDoc of leadsSnap.docs) {
      const leadIdCur = leadDoc.id;
      const leadData = leadDoc.data();
      const leadName = (leadData.name || leadData.businessName || "").toString();

      // optionally filter by leadId even if query couldn't
      if (leadId && leadId !== leadIdCur) continue;

      // NOTES array
      if (!typeSet || typeSet.has("note")) {
        if (Array.isArray(leadData.notes)) {
          for (const n of leadData.notes) {
            const created = toDateOrNull(n?.createdAt) || toDateOrNull(leadData.updatedAt) || null;
            if (!created) continue;
            if (fromDate && created < fromDate) continue;
            if (toDate && created > toDate) continue;

            const text = n?.text || "";
            if (search && !String(text + leadName).toLowerCase().includes(String(search).toLowerCase())) continue;

            items.push({
              id: `${leadIdCur}-note-${created.getTime()}-${Math.random().toString(36).slice(2,8)}`,
              type: "note",
              staffId,
              leadId: leadIdCur,
              leadName,
              text,
              createdAt: created.toISOString(),
              meta: { addedBy: n?.addedBy || null },
            });
          }
        }
      }

      // CALLS array
      if (!typeSet || typeSet.has("call")) {
        if (Array.isArray(leadData.callLogs)) {
          for (const c of leadData.callLogs) {
            const created = toDateOrNull(c?.createdAt);
            if (!created) continue;
            if (fromDate && created < fromDate) continue;
            if (toDate && created > toDate) continue;

            const note = c?.note || "";
            const outcome = c?.outcome || "";
            if (search && !String(note + outcome + leadName).toLowerCase().includes(String(search).toLowerCase())) continue;

            items.push({
              id: `${leadIdCur}-call-${created.getTime()}-${Math.random().toString(36).slice(2,8)}`,
              type: "call",
              staffId,
              leadId: leadIdCur,
              leadName,
              text: note,
              outcome,
              createdAt: created.toISOString(),
              meta: { calledBy: c?.calledBy || null, phone: c?.phone || null },
            });
          }
        }
      }

      // STATUS single (treat updatedAt as status event)
      if (!typeSet || typeSet.has("status")) {
        const updated = toDateOrNull(leadData.updatedAt) || toDateOrNull(leadData.lastCalledAt) || toDateOrNull(leadData.createdAt);
        if (updated) {
          if (!(fromDate && updated < fromDate) && !(toDate && updated > toDate)) {
            const statusText = leadData.status || "new";
            if (!search || String((leadName + statusText)).toLowerCase().includes(String(search).toLowerCase())) {
              items.push({
                id: `${leadIdCur}-status-${updated.getTime()}-${Math.random().toString(36).slice(2,8)}`,
                type: "status",
                staffId,
                leadId: leadIdCur,
                leadName,
                status: statusText,
                createdAt: updated.toISOString(),
                meta: { updatedBy: leadData.lastUpdatedBy || null },
              });
            }
          }
        }
      }

      // LOGS subcollection (if exists)
      if (!typeSet || typeSet.has("log")) {
        try {
          const logSnap = await adminDb.collection("leads").doc(leadIdCur).collection("logs").orderBy("createdAt", "desc").limit(200).get();
          for (const ldoc of logSnap.docs) {
            const ld = ldoc.data();
            const created = toDateOrNull(ld?.createdAt) || null;
            if (!created) continue;
            if (fromDate && created < fromDate) continue;
            if (toDate && created > toDate) continue;

            const text = ld?.text || ld?.message || "";
            if (search && !String(text + leadName).toLowerCase().includes(String(search).toLowerCase())) continue;

            items.push({
              id: `${leadIdCur}-log-${created.getTime()}-${ldoc.id}`,
              type: "log",
              staffId,
              leadId: leadIdCur,
              leadName,
              text,
              createdAt: created.toISOString(),
              meta: { sourceDocId: ldoc.id, raw: ld },
            });
          }
        } catch (e) {
          // ignore subcollection absence/errors
        }
      }
    }

    // Sort descending by createdAt
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination: if cursor provided, return items older than cursor
    let filtered = items;
    if (cursor) {
      const cursorDate = new Date(cursor);
      filtered = filtered.filter((it) => new Date(it.createdAt) < cursorDate);
    }

    const page = Number(limit) > 0 ? Number(limit) : 100;
    const pageItems = filtered.slice(0, page);
    const next = filtered.length > page ? pageItems[pageItems.length - 1].createdAt : null;

    return NextResponse.json({ success: true, items: pageItems, nextCursor: next });
  } catch (err: any) {
    console.error("staff activity error:", err);
    return NextResponse.json({ success: false, message: "Failed to load activity" }, { status: 500 });
  }
}
