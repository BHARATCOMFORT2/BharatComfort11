import nodemailer from "nodemailer";

/**
 * Reusable email sender for BHARATCOMFORT11 system.
 * Automatically uses environment variables for authentication.
 *
 * Required ENV:
 * - EMAIL_HOST (e.g. smtp.gmail.com)
 * - EMAIL_PORT (e.g. 465 or 587)
 * - EMAIL_USER (sender email)
 * - EMAIL_PASS (app password)
 */

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    if (!to) throw new Error("Recipient email missing.");

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const brandName = "BHARATCOMFORT11";

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:auto; background:#fafafa; padding:20px; border-radius:8px; border:1px solid #eee;">
        <h2 style="color:#1d4ed8;">${brandName} Notification</h2>
        <div style="margin-top:10px; font-size:14px; color:#333;">
          ${html}
        </div>
        <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;">
        <p style="font-size:12px; color:#666;">
          This is an automated email from ${brandName}. Please do not reply directly.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `${brandName} <${fromEmail}>`,
      to,
      subject,
      html: emailHTML,
    });

    console.log(`✅ Email sent to ${to} (${subject})`);
    return true;
  } catch (error) {
    console.error("❌ Email send failed:", error);
    return false;
  }
}
