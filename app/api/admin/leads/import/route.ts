// app/api/admin/leads/import/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import * as XLSX from "xlsx";

export async function POST(req: Request) {
  try {
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

    const { db: adminDb } = getFirebaseAdmin();

    let successCount = 0;
    let failed: any[] = [];

    for (const row of rawData) {
      const name = row.name || row.Name;
      const businessName = row.businessName || row["business name"];
      const address = row.address || row.Address;
      const contact = row.contact || row.Contact;
      const email = row.email || row.Email;

      // ✅ Minimal validation
      if (!name || !businessName || !contact) {
        failed.push({ row, reason: "Missing required fields" });
        continue;
      }

      try {
        await adminDb.collection("leads").add({
          name: String(name).trim(),
          businessName: String(businessName).trim(),
          address: address ? String(address).trim() : "",
          contact: String(contact).trim(),
          email: email ? String(email).trim() : "",
          status: "new",           // ✅ default status
          partnerNotes: "",        // ✅ telecaller will update
          assignedTo: null,        // ✅ admin will assign later
          createdAt: FieldValue.serverTimestamp(),
        });

        successCount++;
      } catch (err) {
        failed.push({ row, reason: "Firestore save failed" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Leads imported successfully",
      total: rawData.length,
      successCount,
      failedCount: failed.length,
      failedRows: failed,
    });
  } catch (error: any) {
    console.error("Excel import error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while importing leads",
      },
      { status: 500 }
    );
  }
}
