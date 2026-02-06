export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = authHeader.split("Bearer ")[1];
  const decoded = await getAuth().verifyIdToken(token);

  if (!["admin", "superadmin"].includes(decoded.role)) {
    throw new Error("Forbidden");
  }

  return decoded;
}

/* GET – list all */
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);
    const snap = await adminDb
      .collection("certifications")
      .orderBy("displayOrder", "asc")
      .get();

    return NextResponse.json({
      success: true,
      data: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 401 });
  }
}

/* POST – add new */
export async function POST(req: Request) {
  try {
    const admin = await verifyAdmin(req);
    const body = await req.json();

    const {
      title,
      type,
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
        { success: false, message: "Title & Certificate required" },
        { status: 400 }
      );
    }

    await adminDb.collection("certifications").add({
      title,
      type,
      authority,
      certificateNumber,
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
    return NextResponse.json({ success: false, message: e.message }, { status: 401 });
  }
}
