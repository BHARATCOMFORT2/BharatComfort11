// ✅ Force Node.js runtime and disable static optimization
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";

/**
 * GET /api/users
 * - Admin: get all users
 * - User: get own profile
 */
export async function GET(req: Request) {
  try {
    // ✅ Initialize Firebase Admin lazily
    const { db } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "user";

    const usersRef = collection(db, "users");

    if (role === "admin") {
      // Admin listing all users
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const users = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          role: data.role || "user",
          emailVerified: data.emailVerified || false,
          phoneVerified: data.phoneVerified || false,
          createdAt: data.createdAt,
          lastLogin: data.lastLogin,
        };
      });

      return NextResponse.json({ success: true, users });
    }

    // Regular user: fetch own profile
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    const userData = userSnap.data();

    // Mask Aadhaar if exists
    const maskedAadhaar = userData.aadharNumber
      ? `XXXX-XXXX-${userData.aadharNumber.slice(-4)}`
      : null;

    // Auto-update lastLogin
    await updateDoc(userRef, { lastLogin: serverTimestamp() });

    return NextResponse.json({
      success: true,
      user: {
        uid,
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        emailVerified: userData.emailVerified || false,
        phoneVerified: userData.phoneVerified || false,
        profilePhotoUrl: userData.profilePhotoUrl || "",
        aadharNumber: maskedAadhaar,
        aadharImageUrl: userData.aadharImageUrl || "",
        role: userData.role || "user",
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
      },
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch user(s)", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users
 * - User: update name, profilePhotoUrl, Aadhaar info
 */
export async function PUT(req: Request) {
  try {
    // ✅ Lazy admin init
    const { db } = getFirebaseAdmin();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const allowedFields = [
      "name",
      "profilePhotoUrl",
      "aadharNumber",
      "aadharImageUrl",
    ];

    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        ...updateData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user", details: error.message },
      { status: 500 }
    );
  }
}
