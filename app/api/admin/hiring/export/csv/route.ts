// app/api/admin/hiring/export/csv/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/hiring/export/csv
 *
 * Query params:
 *  - search
 *  - status
 *  - role
 *  - dateFrom
 *  - dateTo
 *  - sort
 *
 * Returns: CSV file output (download)
 */

export async function GET(req: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const url = new URL(req.url);

    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = (url.searchParams.get("status") || "all").toLowerCase();
    const role = url.searchParams.get("role") || "all";
    const sort = (url.searchParams.get("sort") || "newest").toLowerCase();

    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    /** Select collection dynamically */
    const collections = ["applications", "hiringForms"];
    let docs: any[] = [];

    for (const col of collections) {
      const ref = adminDb.collection(col);
      try {
        const snap = await ref.get();
        if (!snap.empty) {
          docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          break;
        }
      } catch {}
    }

    /** If still empty */
    if (docs.length === 0) {
      return new Response("No data available", {
        status: 200,
        headers: {
          "Content-Disposition": "attachment; filename=hiring_export.csv",
          "Content-Type": "text/csv",
        },
      });
    }

    /** Filter: status / role / search */
    docs = docs.filter((it) => {
      if (status !== "all" && (it.status || "").toLowerCase() !== status)
        return false;

      if (role !== "all" && role !== "All" && it.role !== role) return false;

      if (search) {
        const text =
          `${it.name} ${it.email} ${it.phone} ${it.skills || ""}`.toLowerCase();
        if (!text.includes(search)) return false;
      }

      return true;
    });

    /** Date range filtering */
    if (dateFrom) {
      const fromDate = new Date(dateFrom + "T00:00:00");
      docs = docs.filter((it) => {
        try {
          const ts = it.createdAt?._seconds
            ? new Date(it.createdAt._seconds * 1000)
            : new Date(it.createdAt);
          return ts >= fromDate;
        } catch {
          return true;
        }
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo + "T23:59:59");
      docs = docs.filter((it) => {
        try {
          const ts = it.createdAt?._seconds
            ? new Date(it.createdAt._seconds * 1000)
            : new Date(it.createdAt);
          return ts <= toDate;
        } catch {
          return true;
        }
      });
    }

    /** Sorting */
    if (sort === "oldest") {
      docs.sort((a, b) => {
        const ta = a.createdAt?._seconds
          ? a.createdAt._seconds
          : Date.parse(a.createdAt) / 1000;
        const tb = b.createdAt?._seconds
          ? b.createdAt._seconds
          : Date.parse(b.createdAt) / 1000;
        return ta - tb;
      });
    } else if (sort === "newest") {
      docs.sort((a, b) => {
        const ta = a.createdAt?._seconds
          ? a.createdAt._seconds
          : Date.parse(a.createdAt) / 1000;
        const tb = b.createdAt?._seconds
          ? b.createdAt._seconds
          : Date.parse(b.createdAt) / 1000;
        return tb - ta;
      });
    } else if (sort === "name_asc" || sort === "name_desc") {
      docs.sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return sort === "name_asc" ? -1 : 1;
        if (an > bn) return sort === "name_asc" ? 1 : -1;
        return 0;
      });
    }

    /** CSV Header */
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Experience",
      "Status",
      "Date",
      "ResumeURL",
    ];

    const rows = docs.map((it) => {
      const ts = it.createdAt?._seconds
        ? new Date(it.createdAt._seconds * 1000).toISOString()
        : it.createdAt || "";

      return [
        it.name || "",
        it.email || "",
        it.phone || "",
        it.role || "",
        it.experience || "",
        it.status || "",
        ts,
        it.resumeUrl?.signedUrl || it.resumeUrl || it.storagePath || "",
      ]
        .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=hiring_export.csv",
      },
    });
  } catch (err: any) {
    console.error("🔥 CSV export error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
