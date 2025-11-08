import PDFDocument from "pdfkit";
import { db, storage } from "@/lib/firebaseadmin";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

/**
 * 🔹 Generate Refund Invoice PDF and upload it to Firebase Storage.
 * Returns the public invoice URL.
 */
export async function generateRefundInvoice({
  refundId,
  bookingId,
  userId,
  userName = "User",
  userEmail = "",
  amount,
  mode = "razorpay",
  reason = "Booking cancelled as per policy",
  invoiceId: providedInvoiceId,
  createdAt = new Date(),
}: {
  refundId: string;
  bookingId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount: number;
  mode?: string;
  reason?: string;
  invoiceId?: string;
  createdAt?: Date;
}): Promise<Buffer> {
  try {
    // Fetch Firestore data
    const refundRef = doc(db, "refunds", refundId);
    const refundSnap = await getDoc(refundRef);
    const refund = refundSnap.exists() ? refundSnap.data() : {};

    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    const booking = bookingSnap.exists() ? bookingSnap.data() : {};

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const user = userSnap.exists() ? userSnap.data() : {};

    const invoiceId = providedInvoiceId || `INV-RF-${Date.now()}`;

    // ✅ Build PDF in memory and get buffer
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      try {
        const chunks: any[] = [];
        const docPDF = new PDFDocument({ size: "A4", margin: 50 });

        docPDF.on("data", (chunk) => chunks.push(chunk));
        docPDF.on("end", () => resolve(Buffer.concat(chunks)));
        docPDF.on("error", reject);

        // ================== PDF CONTENT ==================
        docPDF
          .fontSize(20)
          .text("BHARATCOMFORT11", { align: "center", underline: true })
          .moveDown(0.5)
          .fontSize(10)
          .text("Email: support@bharatcomfort11.com | Phone: +91 98765 43210", {
            align: "center",
          })
          .moveDown(1);

        docPDF.fontSize(14).text("Refund Invoice", { align: "center" }).moveDown();

        docPDF
          .fontSize(10)
          .text(`Invoice ID: ${invoiceId}`)
          .text(`Refund ID: ${refundId}`)
          .text(`Booking ID: ${bookingId}`)
          .text(`Date: ${createdAt.toLocaleString("en-IN")}`)
          .moveDown(1);

        docPDF
          .fontSize(12)
          .text("Refund To:", { underline: true })
          .text(userName || user?.name || "User")
          .text(userEmail || user?.email || "")
          .text(user?.phone || "")
          .moveDown(1);

        docPDF
          .fontSize(12)
          .text("Refund Details:", { underline: true })
          .text(`Refund Mode: ${mode}`)
          .text(`Refund Amount: ₹${amount}`)
          .text(`Reason: ${reason}`)
          .text(`Original Payment ID: ${booking.paymentId || "N/A"}`)
          .moveDown(1);

        docPDF
          .fontSize(12)
          .text("Booking Info:", { underline: true })
          .text(`Listing: ${booking.listingName || "N/A"}`)
          .text(`Partner: ${booking.partnerName || "N/A"}`)
          .moveDown(1);

        docPDF
          .fontSize(10)
          .text(`Status: Processed`, { continued: true })
          .text(` | Mode: ${mode}`, { align: "right" })
          .moveDown(2);

        docPDF
          .fontSize(9)
          .text("Thank you for choosing BharatComfort11.", {
            align: "center",
            italics: true,
          })
          .moveDown(2)
          .text(
            "This is a system-generated refund invoice for your records. No signature required.",
            { align: "center" }
          );

        docPDF.end();
      } catch (err) {
        reject(err);
      }
    });

    // ✅ Upload to Firebase
    const fileRef = ref(storage, `invoices/refunds/${invoiceId}.pdf`);
    await uploadBytes(fileRef, pdfBuffer, { contentType: "application/pdf" });
    const downloadURL = await getDownloadURL(fileRef);

    // ✅ Update Firestore
    await updateDoc(refundRef, {
      invoiceId,
      invoiceUrl: downloadURL,
      invoiceGeneratedAt: serverTimestamp(),
    });

    console.log("✅ Refund Invoice Generated:", downloadURL);
    return pdfBuffer;
  } catch (err) {
    console.error("❌ Refund Invoice Generation Failed:", err);
    throw err;
  }
}
