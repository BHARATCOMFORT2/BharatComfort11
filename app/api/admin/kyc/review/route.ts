export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/admin/kyc/review/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/admin/kyc/review
 * Body: { partnerId: string, action: "approve" | "reject", remark?: string }
 * (Role check is expected via Firestore Rules or middleware)
 */
export async function POST(req: Request) {
  try {
    const { partnerId, action, remark = "" } = await req.json();

    if (!partnerId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400 }
      );
    }

    const partnerRef = db.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partner = partnerSnap.data()!;
    const status = action === "approve" ? "approved" : "rejected";
    const partnerEmail = partner.email || "-";
    const partnerName = partner.businessName || partner.name || "Partner";

    await partnerRef.update({
      "kyc.status": status,
      "kyc.reviewedAt": new Date(),
      "kyc.remark": remark,
      updatedAt: new Date(),
    });

    // --- Email to partner about decision ---
    try {
      if (partnerEmail && partnerEmail !== "-") {
        await sendEmail(
          partnerEmail,
          status === "approved"
            ? "🎉 KYC Approved — BharatComfort11"
            : "⚠️ KYC Rejected — BharatComfort11",
          `
            <h3>Hi ${partnerName},</h3>
            <p>Your KYC review is complete.</p>
            <p><b>Status:</b> ${status.toUpperCase()}</p>
            ${
              status === "rejected"
                ? `<p><b>Reason:</b> ${remark || "Not specified"}</p>`
                : ""
            }
            <p>${status === "approved"
              ? "You can now access all partner features, including settlements."
              : "Please update and resubmit your documents from the KYC page."
            }</p>
          `
        );
      }
    } catch (e) {
      console.warn("Partner decision email failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: `KYC ${status}`,
    });
  } catch (error) {
    console.error("KYC review error:", error);
    return NextResponse.json({ error: "Failed to review KYC" }, { status: 500 });
  }
}
