import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const msg = {
      to: email, // subscriber email
      from: process.env.SENDGRID_FROM_EMAIL!, // your verified sender
      subject: "Welcome to Our Newsletter 🎉",
      text: `Thanks for subscribing, ${email}! We'll keep you updated.`,
      html: `<p>Thanks for subscribing, <b>${email}</b>! 🎉<br/>We'll keep you updated with the latest news.</p>`,
    };

    await sgMail.send(msg);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SendGrid error:", error.response?.body || error.message);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
