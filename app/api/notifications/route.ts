import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

// POST → Create new notification
export async function POST(req: NextRequest) {
  try {
    const { userId, type, message, link } = await req.json();

    if (!userId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, "notifications"), {
      userId,
      type: type || "general",
      message,
      link: link || null,
      read: false,
      createdAt: Date.now(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (err: any) {
    console.error("Error creating notification:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error("Error fetching notifications:", err.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
