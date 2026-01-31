import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebaseadmin";

/* -------------------------------------------------
   AUTH HELPER
-------------------------------------------------- */
async function verifyAdmin(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await getAuth().verifyIdToken(token);

  if (!["admin", "superadmin"].includes(decoded.role)) {
    throw new Error("Forbidden");
  }

  return decoded;
}

/* -------------------------------------------------
   GET: List all people
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
   POST: Add new person
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

    if (!name || !photoUrl || !type || !role) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    await adminDb.collection("peopleProfiles").add({
      name,
      photoUrl,
      type,
      role,
      contribution: contribution || "",
      qualifications: qualifications || "",
      review: review || "",
      isActive: isActive ?? true,
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
   PATCH: Update / Toggle Active
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
