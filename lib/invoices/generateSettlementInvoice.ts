import { db, storage } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generate Settlement Invoice PDF
 * @param settlementId Firestore document ID
 * @param data { partnerName, partnerEmail, amount, status, utrNumber, date }
 * @returns invoice download URL (string)
 */
export async function generateSettlementInvoice(
  settlementId: string,
  data: {
    partnerName?: string;
    partnerEmail?: string;
    amount?: number;
    status?: string;
    utrNumber?: string;
    date?: string;
  }
): Promise<string> {
  try {
    if (!settlementId || !data) throw new Error("Missing invoice data.");

    const {
      partnerName = "N/A",
      partnerEmail = "N/A",
      amount = 0,
      status = "paid",
      utrNumber = "-",
      date = new Date().toLocaleDateString("en-IN"),
    } = data;

    const gstRate = 0.18;
    const commission = amount * 0.1;
    const gst = commission * gstRate;
    const netPayable = amount - commission - gst;

    // ✅ Generate PDF
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18);
    doc.text("BHARATCOMFORT11", 40, 50);
    doc.setFontSize(12);
    doc.text("Settlement Invoice", 40, 70);
    doc.text(`Invoice ID: ${settlementId}`, 40, 90);
    doc.text(`Date: ${date}`, 40, 110);

    // Partner Info
    doc.text("Partner Details:", 40, 150);
    doc.text(`Name: ${partnerName}`, 60, 170);
    doc.text(`Email: ${partnerEmail}`, 60, 190);

    // Table
    const rows = [
      ["Total Amount", `₹${amount.toLocaleString("en-IN")}`],
      ["Commission (10%)", `₹${commission.toLocaleString("en-IN")}`],
      ["GST (18% on Commission)", `₹${gst.toLocaleString("en-IN")}`],
      ["Net Payable", `₹${netPayable.toLocaleString("en-IN")}`],
      ["Status", status.toUpperCase()],
      ["UTR Number", utrNumber],
    ];

    autoTable(doc, {
      startY: 220,
      head: [["Description", "Value"]],
      body: rows,
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [66, 133, 244] },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 300;
    doc.setFontSize(10);
    doc.text(
      "This is a system-generated invoice. No signature required.",
      40,
      finalY + 40
    );
    doc.text(
      "Thank you for partnering with BHARATCOMFORT11!",
      40,
      finalY + 60
    );

    // ✅ Convert PDF to buffer (server-friendly)
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // ✅ Upload to Firebase Storage
    const fileRef = ref(storage, `invoices/settlements/${settlementId}.pdf`);
    await uploadBytes(fileRef, pdfBuffer, { contentType: "application/pdf" });
    const url = await getDownloadURL(fileRef);

    // ✅ Update settlement in Firestore (Admin SDK)
    const settlementRef = db.collection("settlements").doc(settlementId);
    await settlementRef.update({
      invoiceUrl: url,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Invoice generated for ${settlementId}`);
    return url;
  } catch (error) {
    console.error("❌ Invoice generation failed:", error);
    // ❗ Always return a string (empty fallback), never null
    return "";
  }
}
