import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export async function GET() {
  try {
    // 🔒 Optionally protect this route (only allow logged-in admins)
    // const auth = getAuth();
    // const user = auth.currentUser;
    // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sections = [
      {
        id: "hero",
        data: {
          title: "Welcome to BharatComfort",
          subtitle: "Travel Smart, Stay Comfortable.",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "quickactions",
        data: {
          title: "Quick Bookings",
          subtitle: "Choose your mode of travel",
          actions: [
            { label: "Flights", href: "/travel/airways", icon: "Plane" },
            { label: "Trains", href: "/travel/railways", icon: "Train" },
            { label: "Buses", href: "/travel/roadways", icon: "Bus" },
            { label: "Hotels", href: "/stays", icon: "Hotel" },
          ],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "featuredlistings",
        data: {
          title: "Featured Stays",
          subtitle: "Top rated hotels and villas across India",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "trendingdestinations",
        data: {
          title: "Trending Destinations",
          subtitle: "Discover where everyone’s heading this season",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "promotions",
        data: {
          title: "Seasonal Offers",
          subtitle: "Exclusive discounts on flights and stays",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "recentstories",
        data: {
          title: "Travel Stories",
          subtitle: "Real experiences from our happy travelers",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
      {
        id: "testimonials",
        data: {
          title: "What Our Customers Say",
          subtitle: "Stories from satisfied travelers",
          images: [],
          createdAt: serverTimestamp(),
        },
      },
    ];

    for (const s of sections) {
      await setDoc(doc(db, "homepage", s.id), s.data);
    }

    return NextResponse.json({
      success: true,
      message: "✅ All homepage sections created successfully!",
      sections: sections.map((s) => s.id),
    });
  } catch (err: any) {
    console.error("🔥 Error creating homepage docs:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
