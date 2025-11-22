// app/api/hiring/submit/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { sendNewApplicationNotification } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const name = form.get("name")?.toString() || "";
    const email = form.get("email")?.toString() || "";
    const phone = form.get("phone")?.toString() || "";
    const address = form.get("address")?.toString() || "";
    const education = form.get("education")?.toString() || "";
    const experience = form.get("experience")?.toString() || "";
    const skills = form.get("skills")?.toString() || "";
    const position = form.get("position")?.toString() || ""; // optional field
    const resume = form.get("resume") as File | null;

    const { adminDb, adminStorage } = getFirebaseAdmin();

    // Create doc to get ID
    const docRef = adminDb.collection("hiringForms").doc();
    const docId = docRef.id;

    let storagePath = null;
    let signedResumeUrl = null;

    // Handle resume upload
    if (resume && (resume as any).arrayBuffer) {
      const arr = await (resume as any).arrayBuffer();
      const buffer = Buffer.from(arr);
      const ext = (resume as any).name?.split(".").pop() || "bin";

      const filename = `hiringResumes/${docId}/resume.${ext}`;
      const file = adminStorage.bucket().file(filename);

      await file.save(buffer, {
        contentType: (resume as any).type || "application/octet-stream",
        resumable: false,
      });

      storagePath = `gs://${adminStorage.bucket().name}/${filename}`;

      // Generate signed URL to send to HR
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 15 * 60 * 1000,
      });

      signedResumeUrl = signedUrl;
    }

    // Firestore document
    const data = {
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
    };

    await docRef.set(data);

    // Send email to HR
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
