// app/api/partners/profile/update/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// Extract Authorization header safely under Node.js runtime
function getHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = match[1];

    // Verify Firebase Auth token
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;
    const body = await req.json();

    // Only allow safe fields to be updated
    const allowedFields = ["businessName", "phone", "address", "bank"];
    const updateData: any = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    updateData.updatedAt = new Date();

    // Update partner profile
    await adminDb.collection("partners").doc(uid).update(updateData);

    return NextResponse.json({ ok: true, updated: updateData });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
