import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bharatcomfort11.com";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "BHARATCOMFORT11 <no-reply@bharatcomfort11.com>";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    const experience = (formData.get("experience") as string)?.trim();
    const message = (formData.get("message") as string)?.trim() || "";

    if (!name || !email || !phone || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let resumeUrl: string | null = null;

    /** ------------------------------
     *  SAFE RESUME UPLOAD HANDLING
     * ------------------------------ */
    const resume = formData.get("resume");

    if (resume && typeof resume === "object" && "arrayBuffer" in resume) {
      try {
        const fileBuffer = Buffer.from(await resume.arrayBuffer());

        const originalName =
          //@ts-ignore
          resume.name?.replace(/[^\w.\-]/g, "_") || `resume_${uuidv4()}.pdf`;

        const bucket = getStorage().bucket();
        const filePath = `resumes/${uuidv4()}-${originalName}`;
        const file = bucket.file(filePath);

        await file.save(fileBuffer, {
          metadata: {
            //@ts-ignore
            contentType: resume.type || "application/octet-stream",
          },
        });

        // Try to generate signed URL instead of makePublic()
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: "03-09-2099",
        });

        resumeUrl = signedUrl;
      } catch (uploadErr) {
        console.error("Resume upload failed:", uploadErr);
        resumeUrl = null; // don't fail submission
      }
    }

    /** ------------------------------
     *  FIRESTORE SAVE
     * ------------------------------ */
    const docRef = db.collection("applications").doc();

    await docRef.set({
      name,
      email,
      phone,
      role,
      experience,
      message,
      resumeUrl,
      status: "pending",
      createdAt: new Date(), // FIXED
    });

    /** ------------------------------
     *  SEND ADMIN EMAIL
     * ------------------------------ */
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Job Application: ${name} (${role})`,
        html: `
          <h2>New Application Received</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Experience:</strong> ${experience}</p>
          <p><strong>Message:</strong> ${message}</p>
          ${
            resumeUrl
              ? `<p><strong>Resume:</strong> <a href="${resumeUrl}" target="_blank">Download</a></p>`
              : "<p><strong>Resume:</strong> No file uploaded</p>"
          }
        `,
      });
    } catch (err) {
      console.error("Admin email error:", err);
    }

    /** ------------------------------
     *  SEND APPLICANT CONFIRMATION
     * ------------------------------ */
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `We received your application, ${name}`,
        html: `
          <h2>Thank you for applying at BHARATCOMFORT11</h2>
          <p>We have received your application for <strong>${role}</strong>.</p>
          <p>Our team will contact you soon.</p>
        `,
      });
    } catch (err) {
      console.error("Applicant email error:", err);
    }

    return NextResponse.json(
      { success: true, id: docRef.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Hiring API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
