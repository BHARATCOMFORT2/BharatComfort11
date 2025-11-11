import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin"; // Firebase Admin SDK
import { getStorage } from "firebase-admin/storage";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bharatcomfort11.com";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "BHARATCOMFORT11 <no-reply@bharatcomfort11.com>";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const name = (formData.get("name") as string)?.trim();
    const email = (formData.get("email") as string)?.trim();
    const phone = (formData.get("phone") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    const experience = (formData.get("experience") as string)?.trim();
    const message = (formData.get("message") as string)?.trim() || "";
    const resume = formData.get("resume") as File | null;

    if (!name || !email || !phone || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let resumeUrl: string | null = null;

    // ✅ Upload resume to Cloud Storage (if present)
    if (resume) {
      const buffer = Buffer.from(await resume.arrayBuffer());
      const bucket = getStorage().bucket(); // default bucket
      const safeName = resume.name.replace(/[^\w.\-]/g, "_");
      const fileName = `resumes/${uuidv4()}-${safeName}`;
      const file = bucket.file(fileName);

      await file.save(buffer, {
        metadata: {
          contentType: resume.type || "application/octet-stream",
        },
      });

      await file.makePublic();
      resumeUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    // ✅ Save application in Firestore
    const docRef = db.collection("applications").doc();
    const createdAtISO = new Date().toISOString();

    await docRef.set({
      name,
      email,
      phone,
      role,
      experience,
      message,
      resumeUrl,
      status: "pending",
      createdAt: createdAtISO,
    });

    // ✅ Send admin notification
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject: `New Job Application: ${name} (${role})`,
        html: `
          <div style="font-family:Arial, sans-serif; line-height:1.6;">
            <h2>New Application Received</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Experience:</strong> ${experience}</p>
            <p><strong>Message:</strong> ${message || "N/A"}</p>
            ${
              resumeUrl
                ? `<p><strong>Resume:</strong> <a href="${resumeUrl}" target="_blank" rel="noopener">Download</a></p>`
                : "<p><strong>Resume:</strong> No file uploaded</p>"
            }
            <p><em>Submitted on ${new Date(createdAtISO).toLocaleString("en-IN")}</em></p>
            <p style="color:#888;">Application ID: ${docRef.id}</p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Admin email failed:", e);
    }

    // ✅ Applicant auto-reply
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: `Thanks, ${name}! We received your application for ${role}`,
        html: `
          <div style="font-family:Arial, sans-serif; line-height:1.7; max-width:640px;">
            <h2 style="margin:0 0 12px;">Thanks for applying at BHARATCOMFORT11</h2>
            <p>Hi ${name},</p>
            <p>We’ve received your application for the <strong>${role}</strong> role. Our team will review it and get back to you soon.</p>
            <h3 style="margin:16px 0 8px;">Your Details</h3>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Experience:</strong> ${experience}</li>
              <li><strong>Message:</strong> ${message || "—"}</li>
              ${
                resumeUrl
                  ? `<li><strong>Resume:</strong> <a href="${resumeUrl}" target="_blank" rel="noopener">View/Download</a></li>`
                  : ""
              }
            </ul>
            <p style="margin-top:16px;">If you submitted this in error, you can ignore this email.</p>
            <p style="color:#888; font-size:12px; margin-top:24px;">
              Submitted on ${new Date(createdAtISO).toLocaleString("en-IN")} • Application ID: ${docRef.id}
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error("Applicant auto-reply failed:", e);
      // No need to fail the whole request if email fails.
    }

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving application:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
