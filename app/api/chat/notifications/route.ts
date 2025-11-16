export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

// ✅ Initialize Firebase Admin (only once per server)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

// ✅ Setup SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { chatId, userEmail, message } = await req.json();

    // Example: Send email via SendGrid
    await sgMail.send({
      to: userEmail,
      from: "noreply@bharatcomfort11.com", // replace with verified sender
      subject: "New Chat Notification",
      text: `You have a new message in chat ${chatId}: "${message}"`,
    });

    // Example: Save log in Firestore
    const db = admin.firestore();
    await db.collection("chatNotifications").add({
      chatId,
      userEmail,
      message,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notification Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
