// ✅ app/api/admin/setup-homepage/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🔐 Permanent Admin Lock Setup
 * - Only assigns admin to fixed UID or email
 * - Never overwrites or promotes anyone else
 * - Safe to redeploy anytime
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { admin, adminAuth, adminDb } = getFirebaseAdmin();

    // 🧱 Locked admin identity
    const FIXED_ADMIN_UID = "IRgFuvOL4cbWPIKQtv8STYmsrhh1";
    const FIXED_ADMIN_EMAIL = "shrrajbhar12340@gmail.com";

    // ✅ Get user by UID (preferred) or email
    let user;
    try {
      user = await adminAuth.getUser(FIXED_ADMIN_UID);
    } catch {
      user = await adminAuth.getUserByEmail(FIXED_ADMIN_EMAIL);
    }

    if (!user) {
      throw new Error("❌ Fixed admin user not found in Firebase Auth.");
    }

    const claims = user.customClaims || {};
    // Only set if not already admin
    if (claims.role !== "admin" || !claims.isAdmin) {
      await adminAuth.setCustomUserClaims(user.uid, {
        role: "admin",
        isAdmin: true,
        permanent: true,
      });
      console.log(`✅ Permanently granted admin to ${user.email} (${user.uid})`);
    } else {
      console.log(`ℹ️ ${user.email} already has permanent admin role`);
    }

    // 🏠 Optionally re-create homepage sections if missing
    const homepageSections = [
      { id: "hero", title: "Welcome to BharatComfort", subtitle: "Travel Smart, Stay Comfortable", images: [] },
      { id: "quickactions", title: "Quick Actions", subtitle: "Book your next journey instantly", images: [] },
      { id: "featuredlistings", title: "Featured Listings", subtitle: "Top-rated hotels and stays", images: [] },
      { id: "trendingdestinations", title: "Trending Destinations", subtitle: "Explore popular travel spots", images: [] },
      { id: "promotions", title: "Seasonal Promotions", subtitle: "Save big on your next trip", images: [] },
      { id: "recentstories", title: "Recent Stories", subtitle: "From our amazing travelers", images: [] },
      { id: "testimonials", title: "What Our Users Say", subtitle: "Hear from happy travelers", images: [] },
    ];

    const created: string[] = [];
    const existing: string[] = [];

    for (const s of homepageSections) {
      const docRef = adminDb.collection("homepage").doc(s.id);
      const snap = await docRef.get();
      if (!snap.exists) {
        await docRef.set({
          title: s.title,
          subtitle: s.subtitle,
          images: s.images,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        created.push(s.id);
      } else {
        existing.push(s.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "✅ Permanent admin confirmed and homepage initialized.",
      assignedAdmin: user.email,
      createdSections: created,
      existingSections: existing,
    });
  } catch (err: any) {
    console.error("🔥 Permanent admin setup failed:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
