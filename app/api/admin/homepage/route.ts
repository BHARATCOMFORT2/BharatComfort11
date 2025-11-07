import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🏠 GET /api/admin/homepage?section=hero
 * Fetch homepage section (hero, trending, promotions, etc.)
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("section");
    if (!sectionId)
      return NextResponse.json({ success: false, error: "Missing section parameter" }, { status: 400 });

    const { adminDb } = getFirebaseAdmin();
    const docRef = adminDb.collection("homepage").doc(sectionId.toLowerCase());
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, section: snap.data() });
  } catch (err: any) {
    console.error("🔥 Error fetching homepage section:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load homepage section" },
      { status: 500 }
    );
  }
}

/**
 * 🛠️ POST /api/admin/homepage
 * Updates homepage section (title, subtitle, images)
 * Body: { sectionId, title, subtitle, images }
 */
export async function POST(req: Request) {
  try {
    const { sectionId, title, subtitle, images } = await req.json();

    if (!sectionId)
      return NextResponse.json({ success: false, error: "Missing sectionId" }, { status: 400 });

    const { adminDb } = getFirebaseAdmin();
    const docRef = adminDb.collection("homepage").doc(sectionId.toLowerCase());

    await docRef.set(
      {
        title: title || "",
        subtitle: subtitle || "",
        images: images || [],
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, message: "Homepage section updated" });
  } catch (err: any) {
    console.error("🔥 Error updating homepage section:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update homepage" },
      { status: 500 }
    );
  }
}
