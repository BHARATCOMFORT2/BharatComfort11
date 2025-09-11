import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, setDoc, doc } from "firebase/firestore";

// 🚨 In production, protect this route with admin-only check!
export async function POST(req: NextRequest) {
  try {
    // 1. Seed default roles
    const rolesRef = collection(db, "roles");
    await Promise.all([
      setDoc(doc(rolesRef, "superadmin"), { name: "Super Admin", permissions: ["*"] }),
      setDoc(doc(rolesRef, "partner"), { name: "Partner", permissions: ["manage_listings", "view_bookings"] }),
      setDoc(doc(rolesRef, "staff"), { name: "Staff", permissions: ["view_users", "assist_partners"] }),
      setDoc(doc(rolesRef, "user"), { name: "User", permissions: ["book_listings", "write_reviews"] }),
    ]);

    // 2. Seed sample partners
    const partnersRef = collection(db, "partners");
    const partnerDoc = await addDoc(partnersRef, {
      name: "Bharat Comfort Travels",
      email: "partner@bharatcomfort.com",
      status: "active",
      createdAt: Date.now(),
    });

    // 3. Seed sample listing
    const listingsRef = collection(db, "listings");
    await addDoc(listingsRef, {
      partnerId: partnerDoc.id,
      title: "Luxury Hotel in Mumbai",
      description: "5-star hotel experience with sea view 🌊",
      price: 5000,
      location: "Mumbai, India",
      rating: 4.5,
      featured: true,
      createdAt: Date.now(),
    });

    // 4. Seed dummy story
    const storiesRef = collection(db, "stories");
    await addDoc(storiesRef, {
      title: "Traveler’s Delight in Goa",
      content: "An amazing journey across Goa’s beaches 🏖️",
      author: "Demo User",
      createdAt: Date.now(),
    });

    return NextResponse.json({ message: "✅ Seeding complete" });
  } catch (err: any) {
    console.error("❌ Error seeding data:", err.message);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}
