import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * ✅ create-verified-user API
 * Creates user documents in Firestore AFTER they’re verified.
 * Uses Firebase Admin SDK, so Firestore rules do NOT block it.
 */

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      uid,
      name,
      email,
      phone,
      role = "user",
      referredBy = null,
      referralCode = null,
    } = data;

    if (!uid || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // ✅ Store user in Firestore
    const userRef = adminDb.collection("users").doc(uid);
    await userRef.set(
      {
        uid,
        name,
        email,
        phone,
        role,
        status: role === "partner" ? "pending" : "active",
        emailVerified: true,
        phoneVerified: true,
        verified: true,
        referredBy,
        referralCode,
        createdAt: new Date(),
      },
      { merge: true }
    );

    console.log(`✅ Verified user stored: ${email}`);

    return NextResponse.json({ success: true, message: "User created successfully." });
  } catch (err: any) {
    console.error("❌ Error creating verified user:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
