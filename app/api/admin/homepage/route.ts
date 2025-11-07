// app/api/admin/homepage/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdmin, admin } from "@/lib/firebaseadmin";

/**
 * GET /api/admin/homepage?section=hero
 * Fetch specific homepage section (hero, trending, offers, etc.)
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin")
      return NextResponse.json({ success: false, error: "Only admins allowed" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("section");
    if (!sectionId)
      return NextResponse.json({ success: false, error: "Missing section parameter" }, { status: 400 });

    const { adminDb } = getFirebaseAdmin();
    const docRef = adminDb.collection("homepage_sections").doc(sectionId.toLowerCase());
    const snap = await docRef.get();

    if (!snap.exists)
      return NextResponse.json({ success: false, error: "Section not found" }, { status: 404 });

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
 * POST /api/admin/homepage
 * Updates homepage section (title, subtitle, images)
 * Body: { sectionId, title, subtitle, images }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin")
      return NextResponse.json({ success: false, error: "Only admins allowed" }, { status: 403 });

    const { sectionId, title, subtitle, images } = await req.json();

    if (!sectionId)
      return NextResponse.json({ success: false, error: "Missing sectionId" }, { status: 400 });

    const { adminDb } = getFirebaseAdmin();
    const docRef = adminDb.collection("homepage_sections").doc(sectionId.toLowerCase());

    await docRef.set(
      {
        title: title || "",
        subtitle: subtitle || "",
        images: images || [],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: decoded.email || "Unknown Admin",
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
