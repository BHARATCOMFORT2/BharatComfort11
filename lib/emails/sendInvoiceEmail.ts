import nodemailer from "nodemailer";

/**
 * 🔹 Send Invoice Email (Booking / Refund / Custom)
 */
export async function sendInvoiceEmail({
  to,
  type = "booking",
  subject,
  pdfUrl,
  invoiceId,
  bookingDetails,
  details,
}: {
  to: string;
  type?: "booking" | "refund";
  subject?: string;
  pdfUrl?: string;
  invoiceId?: string;
  bookingDetails?: any;
  details?: {
    name?: string;
    bookingId?: string;
    refundId?: string;
    amount?: number;
    date?: string;
  };
}) {
  try {
    // ✅ Configure transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // ✅ Subject (fallback)
    const emailSubject =
      subject ||
      (type === "booking"
        ? "Your BharatComfort11 Booking Invoice"
        : "Your BharatComfort11 Refund Invoice");

    const booking = bookingDetails || details || {};
    const greeting = `Hi ${booking.userName || booking.name || "Guest"},`;

    // ✅ Dynamic Message
    const message =
      type === "booking"
        ? `
${greeting}

Thank you for booking with BharatComfort11!  
Your booking <b>${booking.bookingId || invoiceId}</b> has been confirmed successfully.

Amount Paid: ₹${booking.amount || details?.amount}

You can download your invoice here: ${pdfUrl}

Warm regards,  
Team BharatComfort11  
support@bharatcomfort11.com
`
        : `
${greeting}

Your refund <b>${booking.refundId || details?.refundId}</b> has been processed successfully.

Booking ID: ${booking.bookingId || details?.bookingId}  
Amount Refunded: ₹${booking.amount || details?.amount}

Download your refund invoice here: ${pdfUrl}

Regards,  
Finance Team  
BharatComfort11
`;

    // ✅ Send Email
    await transporter.sendMail({
      from: `"BharatComfort11" <${process.env.MAIL_USER}>`,
      to,
      subject: emailSubject,
      text: message.replace(/<\/?[^>]+(>|$)/g, ""), // remove HTML tags for text version
      html: `
        <div style="font-family:Arial, sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#2563eb;">${emailSubject}</h2>
          <p>${greeting}</p>
          <p>${
            type === "booking"
              ? `Your booking <b>${booking.bookingId || invoiceId}</b> has been confirmed.`
              : `Your refund <b>${booking.refundId || details?.refundId}</b> for booking <b>${booking.bookingId ||
                  details?.bookingId}</b> has been processed.`
          }</p>
          <p><b>Amount:</b> ₹${booking.amount || details?.amount}</p>
          <p><b>Date:</b> ${details?.date || new Date().toLocaleString("en-IN")}</p>
          ${
            pdfUrl
              ? `<p>You can <a href="${pdfUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">download your invoice here</a>.</p>`
              : ""
          }
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
          <p>Regards,<br><b>BharatComfort11 Team</b><br>
          support@bharatcomfort11.com<br>+91 98765 43210</p>
        </div>
      `,
    });

    console.log(`✅ Invoice email (${type}) sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Failed to send invoice email:", err);
    return { success: false, error: err };
  }
}
