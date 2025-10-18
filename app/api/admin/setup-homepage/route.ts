import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🔐 Admin Setup Route
 *  - Ensures your Firebase user has admin privileges
 *  - Creates all homepage Firestore documents if they don’t exist
 *  - Logs progress for transparency
 */
export async function GET() {
  try {
    const { admin, adminDb, adminAuth } = getFirebaseAdmin();

    // --- 1️⃣ Define homepage sections
    const homepageSections = [
      { id: "hero", title: "Welcome to BharatComfort", subtitle: "Travel Smart, Stay Comfortable", images: [] },
      { id: "quickactions", title: "Quick Actions", subtitle: "Book your next journey instantly", images: [] },
      { id: "featuredlistings", title: "Featured Listings", subtitle: "Top-rated hotels and stays", images: [] },
      { id: "trendingdestinations", title: "Trending Destinations", subtitle: "Explore popular travel spots", images: [] },
      { id: "promotions", title: "Seasonal Promotions", subtitle: "Save big on your next trip", images: [] },
      { id: "recentstories", title: "Recent Stories", subtitle: "From our amazing travelers", images: [] },
      { id: "testimonials", title: "What Our Users Say", subtitle: "Hear from happy travelers", images: [] },
    ];

    // --- 2️⃣ Get all users (for debugging and setting roles)
    const users = await adminAuth.listUsers();
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL; // Optional: set your own email in env

    let targetAdminUser = null;
    if (adminEmail) {
      targetAdminUser = users.users.find((u) => u.email === adminEmail);
    } else {
      targetAdminUser = users.users[0]; // fallback (first user)
    }

    if (!targetAdminUser) {
      throw new Error("❌ No user found to assign admin role.");
    }

    // --- 3️⃣ Ensure admin role
    const customClaims = (targetAdminUser.customClaims || {}) as any;
    if (customClaims.role !== "admin") {
      await adminAuth.setCustomUserClaims(targetAdminUser.uid, { role: "admin" });
      console.log(`✅ Assigned admin role to ${targetAdminUser.email || targetAdminUser.uid}`);
    } else {
      console.log(`ℹ️ ${targetAdminUser.email || targetAdminUser.uid} is already admin`);
    }

    // --- 4️⃣ Create homepage documents
    const createdDocs: string[] = [];
    const existingDocs: string[] = [];

    for (const section of homepageSections) {
      const docRef = adminDb.collection("homepage").doc(section.id);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        await docRef.set({
          title: section.title,
          subtitle: section.subtitle,
          images: section.images,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        createdDocs.push(section.id);
      } else {
        existingDocs.push(section.id);
      }
    }

    // --- 5️⃣ Summary response
    return NextResponse.json({
      success: true,
      message: "✅ Admin setup completed successfully!",
      assignedAdmin: targetAdminUser.email || targetAdminUser.uid,
      createdSections: createdDocs,
      alreadyExistingSections: existingDocs,
    });
  } catch (err: any) {
    console.error("🔥 Error in admin setup route:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
