export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/kyc/submit/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/kyc/submit
 * Body: { aadhaarUrl?, panUrl?, gstUrl?, businessName? }
 * Auth: Bearer <idToken>
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
    const partnerSnap = await ref.get();
    const partner = partnerSnap.data() || {};

    const partnerName = partner.businessName || partner.name || businessName || "Partner";
    const partnerEmail = partner.email || decoded.email || "-";

    await ref.set(
      {
        kyc: {
          aadhaarUrl: aadhaarUrl || partner.kyc?.aadhaarUrl || "",
          panUrl: panUrl || partner.kyc?.panUrl || "",
          gstUrl: gstUrl || partner.kyc?.gstUrl || "",
          businessName: businessName || partner.businessName || "",
          status: "pending",
          submittedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // --- Emails ---
    // Admin notify
    try {
      await sendEmail(
        "admin@bharatcomfort11.com",
        `🪪 New KYC Submitted: ${partnerName}`,
        `
          <h2>New KYC Submission</h2>
          <p><b>Partner:</b> ${partnerName}</p>
          <p><b>Email:</b> ${partnerEmail}</p>
          <ul>
            ${aadhaarUrl ? `<li><a href="${aadhaarUrl}">Aadhaar</a></li>` : ""}
            ${panUrl ? `<li><a href="${panUrl}">PAN</a></li>` : ""}
            ${gstUrl ? `<li><a href="${gstUrl}">GST</a></li>` : ""}
          </ul>
          <p>Review at: <b>Admin &raquo; KYC</b></p>
        `
      );
    } catch (e) {
      console.warn("Admin KYC email failed:", e);
    }

    // Partner confirm
    try {
      if (partnerEmail && partnerEmail !== "-") {
        await sendEmail(
          partnerEmail,
          "✅ KYC Submitted — BharatComfort11",
          `
            <h3>Thanks, ${partnerName}!</h3>
            <p>Your KYC has been submitted successfully and is now pending review.</p>
            <p>We’ll notify you once it’s approved or if we need more details.</p>
          `
        );
      }
    } catch (e) {
      console.warn("Partner confirmation email failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
    });
  } catch (error) {
    console.error("KYC submit error:", error);
    return NextResponse.json({ error: "Failed to submit KYC" }, { status: 500 });
  }
}
