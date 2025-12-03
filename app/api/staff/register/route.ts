// app/api/staff/register/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      password,
      phone,
      city,
      experience,
      languages,
    } = body || {};

    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        {
          success: false,
          error: "MISSING_FIELDS",
          message: "Name, email, password and phone are required.",
        },
        { status: 400 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    // ✅ Check if email already exists
    let existingUser = null;
    try {
      existingUser = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code !== "auth/user-not-found") {
        return NextResponse.json(
          {
            success: false,
            error: "AUTH_CHECK_FAILED",
            message: "Unable to verify email availability.",
          },
          { status: 500 }
        );
      }
    }

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "EMAIL_ALREADY_IN_USE",
          message: "This email is already registered.",
        },
        { status: 400 }
      );
    }

    // ✅ Normalize phone
    let phoneNumber: string | undefined = undefined;
    if (phone) {
      const trimmed = String(phone).trim();
      phoneNumber = trimmed.startsWith("+") ? trimmed : `+91${trimmed}`;
    }

    // ✅ Create Firebase Auth User
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      phoneNumber,
      emailVerified: false,
      disabled: false,
    });

    const staffId = userRecord.uid;

    const normalizedLanguages: string[] =
      Array.isArray(languages)
        ? languages
        : languages
        ? [String(languages)]
        : [];

    // ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅
    // ✅ SAVE ONLY IN staffRequests (NOT IN staff)
    // ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅
    await adminDb.collection("staffRequests").doc(staffId).set({
      name,
      email,
      phone,
      city: city || null,
      experience: experience || null,
      languages: normalizedLanguages,

      role: "telecaller",
      requestedRole: "telecaller",

      status: "pending",   // ✅ admin approval pending
      isActive: false,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "✅ Registration submitted successfully! Admin approval pending.",
        staffId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in staff/register:", error);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message:
          error?.message || "Something went wrong while registering staff.",
      },
      { status: 500 }
    );
  }
}
