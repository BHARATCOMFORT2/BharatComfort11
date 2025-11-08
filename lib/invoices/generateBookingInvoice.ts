import PDFDocument from "pdfkit";
import { db, storage } from "@/lib/firebaseadmin";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";

/**
 * 🔹 Generate Booking Invoice PDF
 */
export async function generateBookingInvoice({
  bookingId,
  userId,
  paymentId,
  amount,
  invoiceId, // ✅ Added
  userName,
  userEmail,
  partnerName,
  checkIn,
  checkOut,
  createdAt,
}: {
  bookingId: string;
  userId?: string;
  paymentId: string;
  amount?: number;
  invoiceId?: string;
  userName?: string;
  userEmail?: string;
  partnerName?: string;
  checkIn?: string | Date;
  checkOut?: string | Date;
  createdAt?: Date;
}) {
  try {
    // 🔹 Fetch booking details
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");

    const booking = bookingSnap.data();

    // 🔹 Fetch user if available
    let user = { name: userName || "Guest", email: userEmail || "", phone: "" };
    if (userId) {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) user = userSnap.data() as any;
    }

    const invoiceNumber = invoiceId || `INV-BK-${Date.now()}`;
    const docBuffer: Buffer[] = [];
    const docPDF = new PDFDocument({ size: "A4", margin: 50 });

    docPDF.on("data", (chunk) => docBuffer.push(chunk));
    docPDF.on("end", async () => {
      const pdfData = Buffer.concat(docBuffer);

      // 🔹 Upload to Firebase Storage
      const fileRef = ref(storage, `invoices/bookings/${invoiceNumber}.pdf`);
      await uploadBytes(fileRef, pdfData, {
        contentType: "application/pdf",
      });
      const downloadURL = await getDownloadURL(fileRef);

      // 🔹 Update Firestore with invoice details
      await updateDoc(bookingRef, {
        invoiceId: invoiceNumber,
        invoiceUrl: downloadURL,
        invoiceGeneratedAt: serverTimestamp(),
      });

      console.log("✅ Booking Invoice Generated:", downloadURL);
      return downloadURL;
    });

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

    docPDF.fontSize(14).text("Booking Invoice", { align: "center" }).moveDown();

    docPDF
      .fontSize(10)
      .text(`Invoice ID: ${invoiceNumber}`)
      .text(`Booking ID: ${bookingId}`)
      .text(`Payment ID: ${paymentId}`)
      .text(`Date: ${(createdAt || new Date()).toLocaleString("en-IN")}`)
      .moveDown(1);

    docPDF
      .fontSize(12)
      .text("Billed To:", { underline: true })
      .text(user.name)
      .text(user.email || "")
      .text(user.phone || "")
      .moveDown(1);

    docPDF
      .fontSize(12)
      .text("Booking Details:", { underline: true })
      .text(`Listing: ${booking.listingName || "N/A"}`)
      .text(`Partner: ${partnerName || booking.partnerName || "N/A"}`)
      .text(`Check-in: ${checkIn || booking.checkIn || "-"}`)
      .text(`Check-out: ${checkOut || booking.checkOut || "-"}`)
      .moveDown(1);

    // Amount section
    const baseAmount = amount || booking.amount || 0;
    const gst = +(baseAmount * 0.18).toFixed(2);
    const total = +(baseAmount + gst).toFixed(2);

    docPDF
      .fontSize(12)
      .text("Amount Breakdown:", { underline: true })
      .text(`Base Amount: ₹${baseAmount}`)
      .text(`GST (18%): ₹${gst}`)
      .text(`Total Paid: ₹${total}`)
      .moveDown(1);

    docPDF
      .fontSize(10)
      .text("Payment Mode: Razorpay", { continued: true })
      .text(" | Status: Paid", { align: "right" })
      .moveDown(2);

    docPDF
      .fontSize(9)
      .text(
        "Thank you for choosing BharatComfort11. Have a pleasant stay!",
        { align: "center", italics: true }
      )
      .moveDown(2)
      .text(
        "This is a computer-generated invoice and does not require a signature.",
        { align: "center" }
      );

    docPDF.end();
  } catch (err) {
    console.error("❌ Invoice Generation Failed:", err);
  }
}
