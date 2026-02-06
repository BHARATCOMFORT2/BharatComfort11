import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * GET: Public / Admin
 * Fetch founder profile
 */
export async function GET() {
  try {
    const ref = adminDb
      .collection("siteSettings")
      .doc("founderProfile");

    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: snap.data() },
      { status: 200 }
    );
  } catch (error) {
    console.error("Founder GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch founder profile" },
      { status: 500 }
    );
  }
}

/**
 * POST: Admin only
 * Create / Update founder profile
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      designation,
      shortBio,
      detailedBio,
      quote,
      photoUrl,
      email,
      linkedin,
      isVisible,
    } = body;

    // Basic validation
    if (!name || !designation) {
      return NextResponse.json(
        { success: false, message: "Name and designation are required" },
        { status: 400 }
      );
    }

    const ref = adminDb
      .collection("siteSettings")
      .doc("founderProfile");

    await ref.set(
      {
        name,
        designation,
        shortBio: shortBio || "",
        detailedBio: detailedBio || "",
        quote: quote || "",
        photoUrl: photoUrl || "",
        email: email || "",
        linkedin: linkedin || "",
        isVisible: isVisible ?? true,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json(
      { success: true, message: "Founder profile updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Founder POST error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update founder profile" },
      { status: 500 }
    );
  }
}
