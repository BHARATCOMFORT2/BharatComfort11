import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const idToken = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(idToken);

    const { fileName, fileType, category = "general", size } = await req.json();
    if (!fileName || !fileType) {
      return NextResponse.json({ ok: false, error: "Missing file details" }, { status: 400 });
    }

    const uploadId = uuidv4();
    const record = {
      uploadId,
      userId: decoded.uid,
      fileName,
      fileType,
      size: size || null,
      category,
      createdAt: new Date(),
    };

    await db.collection("uploads").doc(uploadId).set(record);
    return NextResponse.json({ ok: true, data: record });
  } catch (error) {
    console.error("❌ Upload registration error:", error);
    return NextResponse.json({ ok: false, error: "Upload registration failed" }, { status: 500 });
  }
}
