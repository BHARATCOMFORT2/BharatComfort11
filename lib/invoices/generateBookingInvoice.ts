import PDFDocument from "pdfkit";
import { db } from "@/lib/firebaseadmin";
import { doc, getDoc } from "firebase/firestore";

/**
 * 🔹 Generate Booking Invoice PDF and return a Buffer
 */
export async function generateBookingInvoice({
  bookingId,
  userId,
  paymentId,
  amount,
  invoiceId,
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
}): Promise<Buffer> {
  // 🔹 Fetch booking
  const bookingRef = doc(db, "bookings", bookingId);
  const bookingSnap = await getDoc(bookingRef);
  if (!bookingSnap.exists()) throw new Error("Booking not found");
  const booking = bookingSnap.data();

  const invoiceNumber = invoiceId || `INV-BK-${Date.now()}`;

  // 🔹 Prepare PDF
  const buffers: Buffer[] = [];
  const pdfDoc = new PDFDocument({ size: "A4", margin: 50 });

  pdfDoc.on("data", (chunk) => buffers.push(chunk));

  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("end", () => resolve(Buffer.concat(buffers)));
    pdfDoc.on("error", reject);
  });

  // ================== PDF CONTENT ==================
  pdfDoc
    .fontSize(20)
    .text("BHARATCOMFORT11", { align: "center", underline: true })
    .moveDown(0.5)
    .fontSize(10)
    .text("Email: support@bharatcomfort11.com | Phone: +91 98765 43210", {
      align: "center",
    })
    .moveDown(1);

  pdfDoc.fontSize(14).text("Booking Invoice", { align: "center" }).moveDown();

  pdfDoc
    .fontSize(10)
    .text(`Invoice ID: ${invoiceNumber}`)
    .text(`Booking ID: ${bookingId}`)
    .text(`Payment ID: ${paymentId}`)
    .text(`Date: ${(createdAt || new Date()).toLocaleString("en-IN")}`)
    .moveDown(1);

  pdfDoc
    .fontSize(12)
    .text("Billed To:", { underline: true })
    .text(userName || "Guest")
    .text(userEmail || "")
    .moveDown(1);

  pdfDoc
    .fontSize(12)
    .text("Booking Details:", { underline: true })
    .text(`Listing: ${booking.listingName || "N/A"}`)
    .text(`Partner: ${partnerName || booking.partnerName || "N/A"}`)
    .text(`Check-in: ${checkIn || booking.checkIn || "-"}`)
    .text(`Check-out: ${checkOut || booking.checkOut || "-"}`)
    .moveDown(1);

  const baseAmount = amount || booking.amount || 0;
  const gst = +(baseAmount * 0.18).toFixed(2);
  const total = +(baseAmount + gst).toFixed(2);

  pdfDoc
    .fontSize(12)
    .text("Amount Breakdown:", { underline: true })
    .text(`Base Amount: ₹${baseAmount}`)
    .text(`GST (18%): ₹${gst}`)
    .text(`Total Paid: ₹${total}`)
    .moveDown(1);

  pdfDoc
    .fontSize(10)
    .text("Payment Mode: Razorpay", { continued: true })
    .text(" | Status: Paid", { align: "right" })
    .moveDown(2);

  pdfDoc
    .fontSize(9)
    .text("Thank you for choosing BharatComfort11. Have a pleasant stay!", {
      align: "center",
      italics: true,
    })
    .moveDown(2)
    .text(
      "This is a computer-generated invoice and does not require a signature.",
      { align: "center" }
    );

  pdfDoc.end();

  // 🔹 Wait for PDF to complete and return buffer
  const pdfBuffer = await pdfPromise;
  return pdfBuffer;
}
