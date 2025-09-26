import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();
    const docRef = await adminDb.collection("bookings").add(data);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
