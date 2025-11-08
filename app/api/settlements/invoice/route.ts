import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { generateSettlementInvoice } from "@/lib/invoices/generateSettlementInvoice";

/**
 * GET /api/settlements/invoice?id=<settlementId>
 * Returns existing invoice URL
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const settlementId = searchParams.get("id");

    if (!settlementId) {
      return NextResponse.json(
        { error: "Missing settlementId" },
        { status: 400 }
      );
    }

    // ✅ Admin SDK syntax
    const ref = db.collection("settlements").doc(settlementId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    const settlement = snap.data() || {}; // ✅ default fallback

    if (!settlement.invoiceUrl) {
      return NextResponse.json(
        { message: "Invoice not generated yet", invoiceUrl: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceUrl: settlement.invoiceUrl,
    });
  } catch (error) {
    console.error("❌ Invoice fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settlements/invoice
 * Regenerates invoice PDF for a settlement (admin-only)
 * Body: { settlementId: string }
 */
export async function POST(req: Request) {
  try {
    // ✅ Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "partner";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can regenerate invoices" },
        { status: 403 }
      );
    }

    // ✅ Parse request
    const { settlementId } = await req.json();
    if (!settlementId)
      return NextResponse.json(
        { error: "Missing settlementId" },
        { status: 400 }
      );

    // ✅ Admin SDK syntax
    const ref = db.collection("settlements").doc(settlementId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    const settlement = snap.data() || {}; // ✅ Prevent undefined

    // ✅ Only regenerate if paid
    if (!("status" in settlement) || settlement.status !== "paid") {
      return NextResponse.json(
        { error: "Invoice can only be generated for paid settlements" },
        { status: 400 }
      );
    }

    // ✅ Generate invoice PDF
    const url = await generateSettlementInvoice(settlementId, {
      partnerName: settlement.partnerName,
      partnerEmail: settlement.partnerEmail,
      amount: settlement.amount,
      status: settlement.status,
      utrNumber: settlement.utrNumber || "-",
    });

    if (!url) {
      return NextResponse.json(
        { error: "Invoice generation failed" },
        { status: 500 }
      );
    }

    // ✅ Update settlement record
    await ref.update({
      invoiceUrl: url,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Invoice regenerated successfully",
      invoiceUrl: url,
    });
  } catch (error) {
    console.error("❌ Invoice regeneration error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate invoice" },
      { status: 500 }
    );
  }
}
