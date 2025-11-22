// app/api/admin/hiring/list/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin hiring list
 * Query params:
 *  - search: string (search name/email/phone)
 *  - status: pending|reviewing|shortlisted|rejected|hired|all
 *  - role: role name or 'all'
 *  - sort: newest|oldest|name_asc|name_desc
 *  - page: number (1-indexed)
 *  - limit: number
 *  - dateFrom: YYYY-MM-DD
 *  - dateTo: YYYY-MM-DD
 *
 * Response:
 *  { success: true, items: [...], total, page, pages }
 */
export async function GET(req: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const url = new URL(req.url);

    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const status = (url.searchParams.get("status") || "all").toLowerCase();
    const role = (url.searchParams.get("role") || "all");
    const sort = (url.searchParams.get("sort") || "newest").toLowerCase();
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit") || "20")));

    const dateFrom = url.searchParams.get("dateFrom"); // expect YYYY-MM-DD
    const dateTo = url.searchParams.get("dateTo"); // expect YYYY-MM-DD

    // Helper: build candidate query for a collection
    function buildQueryForCollection(colRef: any) {
      let q: any = colRef;

      // Filter by status and role where possible (server-side)
      if (status && status !== "all") {
        q = q.where("status", "==", status);
      }
      if (role && role !== "All" && role !== "all") {
        q = q.where("role", "==", role);
      }

      // Date range filter (server-side if createdAt stored as timestamp)
      if (dateFrom) {
        const fromDate = new Date(dateFrom + "T00:00:00.000Z");
        q = q.where("createdAt", ">=", fromDate);
      }
      if (dateTo) {
        // include entire day
        const toDate = new Date(dateTo + "T23:59:59.999Z");
        q = q.where("createdAt", "<=", toDate);
      }

      // Only ordering by createdAt server-side when possible
      if (sort === "oldest") {
        q = q.orderBy("createdAt", "asc");
      } else {
        // newest default
        q = q.orderBy("createdAt", "desc");
      }

      return q;
    }

    // Try primary collection names in order of likelihood
    const candidates = ["applications", "hiringForms", "hiring_forms", "jobApplications"];
    let docs: any[] = [];
    let usedCollection = null;

    for (const col of candidates) {
      const colRef = adminDb.collection(col);
      // Build query and attempt to get documents
      try {
        const q = buildQueryForCollection(colRef);
        const snap = await q.get();
        if (!snap.empty) {
          usedCollection = col;
          snap.forEach((d: any) => docs.push({ id: d.id, ...d.data() }));
          break;
        } else {
          // keep candidate but continue to next — we will use fallback if no collection had docs
        }
      } catch (err) {
        // If any query fails (e.g. ordering/where on non-existing field), fall back to fetching all from the collection
        try {
          const snap = await colRef.get();
          if (!snap.empty) {
            usedCollection = col;
            snap.forEach((d: any) => docs.push({ id: d.id, ...d.data() }));
            break;
          }
        } catch {
          // ignore and continue
        }
      }
    }

    // If still empty, try the first candidate with at least a read (so we return empty array instead of crashing)
    if (!usedCollection) {
      // attempt to read from first candidate (even if empty)
      try {
        const snap = await adminDb.collection(candidates[0]).get();
        snap.forEach((d: any) => docs.push({ id: d.id, ...d.data() }));
        usedCollection = candidates[0];
      } catch {
        // nothing found - return empty
        return NextResponse.json({
          success: true,
          items: [],
          total: 0,
          page,
          pages: 0,
          collection: null,
        });
      }
    }

    // In-memory search filtering (name/email/phone)
    if (search) {
      docs = docs.filter((it) => {
        const hay =
          (`${it.name || ""} ${it.email || ""} ${it.phone || ""} ${it.skills || ""}`).toLowerCase();
        return hay.includes(search);
      });
    }

    // Name sorting if requested (server didn't handle this)
    if (sort === "name_asc" || sort === "name_desc") {
      docs.sort((a: any, b: any) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return sort === "name_asc" ? -1 : 1;
        if (an > bn) return sort === "name_asc" ? 1 : -1;
        return 0;
      });
    }

    const total = docs.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = docs.slice(start, end);

    // Normalize createdAt for client convenience
    const items = paginated.map((it) => {
      const createdAt = it.createdAt;
      let created = createdAt;
      try {
        // Firestore Timestamp -> convert to object with _seconds if present so client can detect
        if (createdAt && typeof createdAt.toDate === "function") {
          created = { _seconds: Math.floor(createdAt.toDate().getTime() / 1000) };
        }
      } catch {
        // leave as-is
      }
      return { ...it, createdAt: created };
    });

    return NextResponse.json({
      success: true,
      collection: usedCollection,
      items,
      total,
      page,
      pages,
    });
  } catch (err: any) {
    console.error("🔥 Admin hiring list error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
