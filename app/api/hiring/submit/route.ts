// app/api/hiring/submit/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { sendNewApplicationNotification } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const address = String(form.get("address") || "").trim();
    const education = String(form.get("education") || "").trim();
    const experience = String(form.get("experience") || "").trim();
    const skills = String(form.get("skills") || "").trim();
    const position = String(form.get("position") || "").trim();
    const resume: any = form.get("resume");

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { adminDb, adminStorage } = getFirebaseAdmin();

    // Create Firestore doc
    const docRef = adminDb.collection("hiringForms").doc();
    const docId = docRef.id;

    let storagePath = null;
    let signedResumeUrl = null;

    /* ---------------------------
     * SAFE RESUME UPLOAD HANDLING
     * --------------------------- */
    if (resume && typeof resume === "object" && "arrayBuffer" in resume) {
      try {
        const arrayBuf = await resume.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);

        // normalize file extension
        const safeOriginalName =
          resume.name?.replace(/[^\w.\-]/g, "_") || `resume_${docId}.pdf`;

        const ext = safeOriginalName.split(".").pop() || "pdf";

        const filename = `hiringResumes/${docId}/resume.${ext}`;
        const bucketFile = adminStorage.bucket().file(filename);

        await bucketFile.save(buffer, {
          metadata: {
            contentType: resume.type || "application/pdf",
          },
          resumable: false,
        });

        storagePath = `gs://${adminStorage.bucket().name}/${filename}`;

        // Long-term signed URL (year 2099)
        const [signedUrl] = await bucketFile.getSignedUrl({
          action: "read",
          expires: "03-09-2099",
        });

        signedResumeUrl = signedUrl;
      } catch (uploadErr) {
        console.error("Resume upload failed:", uploadErr);
        storagePath = null;
        signedResumeUrl = null;
      }
    }

    /* ---------------------------
     * SAVE TO FIRESTORE
     * --------------------------- */
    await docRef.set({
      name,
      email,
      phone,
      address,
      education,
      experience,
      skills,
      position,
      storagePath,
      status: "pending",
      adminNotes: "",
      createdAt: new Date(),
      statusHistory: [
        {
          status: "pending",
          timestamp: new Date(),
          message: "Application received.",
        },
      ],
    });

    /* ---------------------------
     * SEND EMAIL NOTIFICATION
     * --------------------------- */
    await sendNewApplicationNotification({
      applicantName: name,
      applicantEmail: email,
      applicantPhone: phone,
      position,
      resumeUrl: signedResumeUrl,
      submittedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: docId });
  } catch (err: any) {
    console.error("🔥 Hiring submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
