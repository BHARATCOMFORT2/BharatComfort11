export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin"; // ✅ Use Admin SDK

// POST → Create new notification
export async function POST(req: NextRequest) {
  try {
    const { userId, type, message, link } = await req.json();

    if (!userId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const newNotification = {
      userId,
      type: type || "general",
      message,
      link: link || null,
      read: false,
      createdAt: Date.now(),
    };

    const docRef = await db.collection("notifications").add(newNotification);

    return NextResponse.json({ id: docRef.id, success: true });
  } catch (err: any) {
    console.error("❌ Error creating notification:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET → Fetch notifications for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, notifications });
  } catch (err: any) {
    console.error("❌ Error fetching notifications:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
