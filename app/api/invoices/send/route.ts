import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { doc, getDoc } from "firebase/firestore";
import { sendInvoiceEmail } from "@/lib/emails/sendInvoiceEmail";

/**
 * POST /api/invoices/send
 * Body: { type: "booking" | "refund", id: string }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";
    const uid = decoded.uid;

    const { type, id } = await req.json();
    if (!type || !id)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Determine collection
    const collectionName = type === "refund" ? "refunds" : "bookings";
    const docRef = doc(db, collectionName, id);
    const snap = await getDoc(docRef);

    if (!snap.exists())
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    const record = snap.data();

    // Access control
    if (role !== "admin" && record.userId !== uid) {
      return NextResponse.json(
        { error: "Forbidden: You don’t have access to this invoice" },
        { status: 403 }
      );
    }

    // Check if invoice exists
    if (!record.invoiceUrl) {
      return NextResponse.json(
        { error: "Invoice not generated yet" },
        { status: 400 }
      );
    }

    // Fetch user for email
    const userRef = doc(db, "users", record.userId);
    const userSnap = await getDoc(userRef);
    const user = userSnap.exists() ? userSnap.data() : {};

    // Send existing invoice email
    const result = await sendInvoiceEmail({
      to: user.email,
      type: type,
      pdfUrl: record.invoiceUrl,
      details: {
        name: user.name,
        bookingId: type === "booking" ? id : record.bookingId,
        refundId: type === "refund" ? id : undefined,
        amount: record.amount,
        date: new Date().toLocaleString("en-IN"),
      },
    });

    if (result.success) {
      console.log(`✅ ${type} invoice re-sent to ${user.email}`);
      return NextResponse.json({
        success: true,
        message: "Invoice re-sent successfully",
      });
    } else {
      throw new Error("Failed to send invoice email");
    }
  } catch (err: any) {
    console.error("❌ /api/invoices/send error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
