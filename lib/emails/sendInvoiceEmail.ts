import nodemailer from "nodemailer";

/**
 * 🔹 Send Invoice Email (Booking or Refund)
 * @param {Object} params
 * @param {string} params.to - recipient email
 * @param {string} params.type - "booking" | "refund"
 * @param {string} params.pdfUrl - public download link from Firebase
 * @param {Object} params.details - invoice metadata (user, amount, bookingId, etc.)
 */
export async function sendInvoiceEmail({
  to,
  type,
  pdfUrl,
  details,
}: {
  to: string;
  type: "booking" | "refund";
  pdfUrl: string;
  details: {
    name?: string;
    bookingId?: string;
    refundId?: string;
    amount?: number;
    date?: string;
  };
}) {
  try {
    // ✅ Configure transporter (use your SMTP or Gmail App Password)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // ✅ Dynamic Subject & Body
    const subject =
      type === "booking"
        ? "Your BharatComfort11 Booking Invoice"
        : "Your BharatComfort11 Refund Invoice";

    const greeting = `Hi ${details.name || "Guest"},`;

    const message =
      type === "booking"
        ? `
${greeting}

Thank you for booking with BharatComfort11!  
Your booking has been confirmed successfully.

Booking ID: ${details.bookingId}  
Amount Paid: ₹${details.amount}

You can download your official invoice below:
${pdfUrl}

Warm regards,  
Team BharatComfort11  
support@bharatcomfort11.com
`
        : `
${greeting}

Your refund has been processed successfully as per BharatComfort11 policy.

Refund ID: ${details.refundId}  
Booking ID: ${details.bookingId}  
Amount Refunded: ₹${details.amount}

You can download your refund invoice below:
${pdfUrl}

Regards,  
Finance Team  
BharatComfort11
`;

    // ✅ Send Email
    await transporter.sendMail({
      from: `"BharatComfort11" <${process.env.MAIL_USER}>`,
      to,
      subject,
      text: message,
      html: `
        <div style="font-family:Arial, sans-serif;line-height:1.6;color:#333;">
          <h2 style="color:#2563eb;">${subject}</h2>
          <p>${greeting}</p>
          <p>${
            type === "booking"
              ? `Your booking <b>${details.bookingId}</b> has been confirmed.`
              : `Your refund <b>${details.refundId}</b> for booking <b>${details.bookingId}</b> has been processed.`
          }</p>
          <p><b>Amount:</b> ₹${details.amount}</p>
          <p><b>Date:</b> ${details.date || new Date().toLocaleDateString(
            "en-IN"
          )}</p>
          <p>You can <a href="${pdfUrl}" target="_blank" style="color:#2563eb;text-decoration:underline;">download your invoice here</a>.</p>
          <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
          <p>Regards,<br><b>BharatComfort11 Team</b><br>
          support@bharatcomfort11.com<br>+91 98765 43210</p>
        </div>
      `,
    });

    console.log(`✅ ${type} invoice email sent to ${to}`);
    return { success: true };
  } catch (err) {
    console.error("❌ Failed to send invoice email:", err);
    return { success: false, error: err };
  }
}
