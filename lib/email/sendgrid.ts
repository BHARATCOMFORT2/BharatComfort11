// lib/email/sendgrid.ts
// Simple SendGrid email helper for BHARATCOMFORT11
import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const HR_FROM = process.env.HR_FROM || "no-reply@yourdomain.com";
const HR_TO = process.env.HR_TO || "hr@yourdomain.com"; // fallback HR inbox

if (!SENDGRID_API_KEY) {
  console.warn("⚠️ SENDGRID_API_KEY is not set. Emails will fail.");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

type SendResult = { success: boolean; error?: string };

export async function sendNewApplicationNotification({
  applicantName,
  applicantEmail,
  applicantPhone,
  position,
  resumeUrl, // optional signed URL
  submittedAt,
}: {
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  position?: string;
  resumeUrl?: string;
  submittedAt?: string;
}): Promise<SendResult> {
  try {
    const subject = `[New Application] ${applicantName} ${position ? `- ${position}` : ""}`;
    const html = `
      <p>New hiring application received.</p>
      <ul>
        <li><strong>Name:</strong> ${applicantName}</li>
        <li><strong>Email:</strong> ${applicantEmail}</li>
        <li><strong>Phone:</strong> ${applicantPhone || "—"}</li>
        <li><strong>Position:</strong> ${position || "—"}</li>
        <li><strong>Submitted:</strong> ${submittedAt || new Date().toISOString()}</li>
      </ul>
      ${resumeUrl ? `<p><a href="${resumeUrl}">Download resume (signed link)</a></p>` : "<p>No resume attached.</p>"}
    `;

    await sgMail.send({
      to: HR_TO,
      from: HR_FROM,
      subject,
      html,
    });

    return { success: true };
  } catch (err: any) {
    console.error("🔥 sendNewApplicationNotification error:", err);
    return { success: false, error: err.message || "SendGrid error" };
  }
}

export async function sendStatusChangeEmail({
  to,
  applicantName,
  newStatus,
  notes,
}: {
  to: string;
  applicantName?: string;
  newStatus: string;
  notes?: string;
}): Promise<SendResult> {
  try {
    const subject = `Your application status: ${newStatus}`;
    const html = `
      <p>Hi ${applicantName || "Applicant"},</p>
      <p>Your application status has been updated to: <strong>${newStatus}</strong>.</p>
      ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}
      <p>Thank you for applying to BHARATCOMFORT11.</p>
    `;

    await sgMail.send({
      to,
      from: HR_FROM,
      subject,
      html,
    });

    return { success: true };
  } catch (err: any) {
    console.error("🔥 sendStatusChangeEmail error:", err);
    return { success: false, error: err.message || "SendGrid error" };
  }
}
