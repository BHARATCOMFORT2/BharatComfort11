export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";

/* -------------------------------------------------
   AUTH HELPER (FIXED)
-------------------------------------------------- */
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await getAuth().verifyIdToken(token);

  // 🔥 FIX: role token se nahi, Firestore se check hoga
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) {
    throw new Error("User not found");
  }

  const role = userSnap.data()?.role;
  if (!["admin", "superadmin"].includes(role)) {
    throw new Error("Forbidden");
  }

  return decoded;
}

/* -------------------------------------------------
   GET: List all people (ADMIN)
-------------------------------------------------- */
export async function GET(request: Request) {
  try {
    await verifyAdmin(request);

    const snap = await adminDb
      .collection("peopleProfiles")
      .orderBy("createdAt", "desc")
      .get();

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 401 }
    );
  }
}

/* -------------------------------------------------
   POST: Add new investor / contributor (FIXED)
-------------------------------------------------- */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    const body = await request.json();

    const {
      name,
      photoUrl,
      type,
      role,
      contribution,
      qualifications,
      review,
      isActive,
    } = body;

    // ✅ Strong validation
    if (
      !name ||
      !String(name).trim() ||
      !photoUrl ||
      !type ||
      !role ||
      !String(role).trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Name, Photo, Type and Role are required" },
        { status: 400 }
      );
    }

    await adminDb.collection("peopleProfiles").add({
      name: String(name).trim(),
      photoUrl,
      type, // "investor" | "contributor"
      role: String(role).trim(),
      contribution: contribution || "",
      qualifications: qualifications || "",
      review: review || "",
      isActive: Boolean(isActive ?? true), // 🔥 HARD BOOLEAN
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: admin.uid,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 401 }
    );
  }
}

/* -------------------------------------------------
   PATCH: Update / Toggle Active (SAFE)
-------------------------------------------------- */
export async function PATCH(request: Request) {
  try {
    await verifyAdmin(request);
    const body = await request.json();

    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID required" },
        { status: 400 }
      );
    }

    await adminDb
      .collection("peopleProfiles")
      .doc(id)
      .update({
        ...updates,
        isActive:
          updates.isActive !== undefined
            ? Boolean(updates.isActive)
            : undefined,
        updatedAt: new Date(),
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 401 }
    );
  }
}
