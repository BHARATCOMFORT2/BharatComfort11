export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import * as XLSX from "xlsx";

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

// ✅ Allowed categories fallback
const DEFAULT_CATEGORY = "hotel";

export async function POST(req: Request) {
  try {
    // ✅ ADMIN TOKEN VERIFY
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

    // ✅ FILE VALIDATION
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Invalid file upload request" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Excel file is required" },
        { status: 400 }
      );
    }

    // ✅ READ EXCEL
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

    if (!rawData.length) {
      return NextResponse.json(
        { success: false, message: "Excel sheet is empty" },
        { status: 400 }
      );
    }

    let successCount = 0;
    const failed: any[] = [];
    const now = new Date();

    for (const row of rawData) {
      const name = row.name || row.Name;
      const businessName = row.businessName || row["business name"];
      const phone = row.phone || row.Phone || row.contact || row.Contact;
      const email = row.email || row.Email;
      const address = row.address || row.Address;
      const city = row.city || row.City;
      const category = row.category || row.Category || DEFAULT_CATEGORY;
      const followupDate =
        row.followupDate || row["followup date"] || row.FollowupDate;

      // ✅ Minimal validation
      if (!name || !phone) {
        failed.push({ row, reason: "Missing name or phone" });
        continue;
      }

      try {
        await adminDb.collection("leads").add({
          name: String(name).trim(),
          businessName: String(businessName || "").trim(),
          phone: String(phone).trim(),
          email: String(email || "").trim(),
          address: String(address || "").trim(),
          city: String(city || "").trim(),

          category: String(category || DEFAULT_CATEGORY).trim(),
          status: "new",

          followupDate: String(followupDate || "").trim(), // ✅ date filter compatible
          assignedTo: null,

          adminNote: "",
          partnerNotes: "",

          notes: [],
          callLogs: [],

          createdBy: adminId,
          createdAt: now,
          updatedAt: now,
          lastUpdatedBy: adminId,
        });

        successCount++;
      } catch (err) {
        failed.push({ row, reason: "Firestore save failed" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "✅ Leads imported successfully",
      total: rawData.length,
      successCount,
      failedCount: failed.length,
      failedRows: failed,
    });
  } catch (error: any) {
    console.error("ADMIN IMPORT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while importing leads",
      },
      { status: 500 }
    );
  }
}
