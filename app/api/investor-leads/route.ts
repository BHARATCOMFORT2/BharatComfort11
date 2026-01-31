import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await adminDb.collection("investorLeads").add({
      ...body,
      status: "new",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
