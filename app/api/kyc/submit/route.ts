import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";

/**
 * POST /api/kyc/submit
 * Body: { aadhaarUrl, panUrl, gstUrl, businessName }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const { aadhaarUrl, panUrl, gstUrl, businessName } = await req.json();

    if (!aadhaarUrl && !panUrl && !gstUrl) {
      return NextResponse.json(
        { error: "At least one document required" },
        { status: 400 }
      );
    }

    const ref = db.collection("partners").doc(uid);
    await ref.set(
      {
        kyc: {
          aadhaarUrl,
          panUrl,
          gstUrl,
          businessName: businessName || "",
          status: "pending",
          submittedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
    });
  } catch (error) {
    console.error("KYC submit error:", error);
    return NextResponse.json({ error: "Failed to submit KYC" }, { status: 500 });
  }
}
