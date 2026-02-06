export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";

/* 🔐 VERIFY ADMIN */
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await getAuth().verifyIdToken(token);

  const isAdmin =
    decoded.role === "admin" ||
    decoded.role === "superadmin" ||
    decoded.admin === true ||
    decoded.isAdmin === true;

  if (!isAdmin) {
    throw new Error("FORBIDDEN");
  }

  return decoded;
}

/* =========================
   GET – list certificates
========================= */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const snap = await adminDb
      .collection("certifications")
      .orderBy("displayOrder", "asc")
      .get();

    return NextResponse.json({
      success: true,
      data: snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })),
    });
  } catch (e: any) {
    const status =
      e.message === "UNAUTHORIZED" ? 401 :
      e.message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json(
      { success: false, message: e.message },
      { status }
    );
  }
}

/* =========================
   POST – add certificate
========================= */
export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    const body = await req.json();

    const {
      title,
      type = "general",
      authority,
      certificateNumber,
      certificateUrl,
      issuedOn,
      expiresOn,
      description,
      isActive,
      displayOrder,
    } = body;

    if (!title || !certificateUrl) {
      return NextResponse.json(
        { success: false, message: "Title & Certificate image are required" },
        { status: 400 }
      );
    }

    await adminDb.collection("certifications").add({
      title,
      type,
      authority: authority || "",
      certificateNumber: certificateNumber || "",
      certificateUrl,
      issuedOn: issuedOn || null,
      expiresOn: expiresOn || null,
      description: description || "",
      isActive: isActive ?? true,
      displayOrder: displayOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: admin.uid,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    const status =
      e.message === "UNAUTHORIZED" ? 401 :
      e.message === "FORBIDDEN" ? 403 : 500;

    return NextResponse.json(
      { success: false, message: e.message },
      { status }
    );
  }
}
