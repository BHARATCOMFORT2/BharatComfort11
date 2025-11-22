// app/api/admin/hiring/export/pdf/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { adminDb, adminStorage } = getFirebaseAdmin();
    const url = new URL(req.url);

    const search = (url.searchParams.get("search") || "").toLowerCase();
    const status = (url.searchParams.get("status") || "all").toLowerCase();
    const role = url.searchParams.get("role") || "all";
    const sort = (url.searchParams.get("sort") || "newest").toLowerCase();

    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    /** Try both collections */
    const collections = ["applications", "hiringForms"];
    let docs: any[] = [];

    for (const col of collections) {
      const snap = await adminDb.collection(col).get();
      if (!snap.empty) {
        docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        break;
      }
    }

    /** Apply filters */
    docs = docs.filter((it) => {
      if (status !== "all" && it.status !== status) return false;
      if (role !== "all" && it.role !== role) return false;
      if (search) {
        const t = (
          `${it.name} ${it.email} ${it.phone} ${it.skills || ""}`
        ).toLowerCase();
        if (!t.includes(search)) return false;
      }
      return true;
    });

    /** Date range filter */
    if (dateFrom) {
      const fromDate = new Date(dateFrom + "T00:00:00");
      docs = docs.filter((it) => {
        const ts = it.createdAt?._seconds
          ? new Date(it.createdAt._seconds * 1000)
          : new Date(it.createdAt);
        return ts >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo + "T23:59:59");
      docs = docs.filter((it) => {
        const ts = it.createdAt?._seconds
          ? new Date(it.createdAt._seconds * 1000)
          : new Date(it.createdAt);
        return ts <= toDate;
      });
    }

    /** Sorting */
    if (sort === "name_asc" || sort === "name_desc") {
      docs.sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return sort === "name_asc" ? -1 : 1;
        if (an > bn) return sort === "name_asc" ? 1 : -1;
        return 0;
      });
    } else {
      docs.sort((a, b) => {
        const ta = a.createdAt?._seconds
          ? a.createdAt._seconds
          : Date.parse(a.createdAt) / 1000;
        const tb = b.createdAt?._seconds
          ? b.createdAt._seconds
          : Date.parse(b.createdAt) / 1000;
        return sort === "oldest" ? ta - tb : tb - ta;
      });
    }

    /** Create PDF */
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 50;

    const title = "BHARATCOMFORT11 — Hiring Report";
    page.drawText(title, {
      x: 50,
      y,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    /** Helper to add new page when needed */
    const addPage = () => {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      y = height - 40;
    };

    /** Loop over applicants */
    for (const it of docs) {
      if (y < 100) addPage();

      const created = it.createdAt?._seconds
        ? new Date(it.createdAt._seconds * 1000).toLocaleString()
        : it.createdAt
        ? new Date(it.createdAt).toLocaleString()
        : "-";

      page.drawText(`Name: ${it.name || "-"}`, { x: 50, y, size: 12, font });
      y -= 16;

      page.drawText(`Email: ${it.email || "-"}`, { x: 50, y, size: 12, font });
      y -= 16;

      page.drawText(`Phone: ${it.phone || "-"}`, { x: 50, y, size: 12, font });
      y -= 16;

      page.drawText(`Role: ${it.role || "-"}`, { x: 50, y, size: 12, font });
      y -= 16;

      page.drawText(`Experience: ${it.experience || "-"}`, {
        x: 50,
        y,
        size: 12,
        font,
      });
      y -= 16;

      page.drawText(`Skills: ${it.skills || "-"}`, {
        x: 50,
        y,
        size: 12,
        font,
      });
      y -= 16;

      page.drawText(`Status: ${it.status}`, { x: 50, y, size: 12, font });
      y -= 16;

      page.drawText(`Submitted: ${created}`, { x: 50, y, size: 12, font });
      y -= 16;

      /** Resume link */
      const resume = it.resumeUrl || it.storagePath || "";
      if (resume) {
        page.drawText(`Resume: ${resume}`, { x: 50, y, size: 10, font });
        y -= 16;
      }

      y -= 10;
    }

    const pdfBytes = await pdfDoc.save();
    const fileName = `hiring_export_${Date.now()}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error("🔥 PDF export error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
