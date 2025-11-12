export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "seed";
    const seedId = url.searchParams.get("seedId") || makeId();
    const homepageRef = adminDb.collection("homepage");

    // Delete Mode
    if (action === "delete") {
      let deleted = 0;
      const docs = await homepageRef.listDocuments();
      for (const doc of docs) {
        const snap = await doc.get();
        const data = snap.data();
        if (data?.seedId === seedId || data?.isSample) {
          await doc.delete();
          deleted++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `🗑️ Deleted ${deleted} homepage sample docs for seedId ${seedId}`,
      });
    }

    // SEED MODE
    const seedNote = "SAMPLE HOMEPAGE DATA — visible to all users, not real content.";
    const now = new Date();

    // ✅ Featured Listings (15)
    const featuredListings = Array.from({ length: 15 }, (_, i) => ({
      id: `sample-trip-${i + 1}`,
      title: `${rand(["Manali", "Goa", "Jaipur", "Rishikesh", "Darjeeling", "Ooty", "Shimla", "Coorg", "Udaipur", "Ladakh"])} ${rand(["Retreat", "Escape", "Adventure", "Getaway"])}`,
      description: rand([
        "Enjoy 3N/4D with meals and guided tours.",
        "Perfect for families and couples — all-inclusive.",
        "Includes hotel, local transfers, and sightseeing.",
      ]),
      imageUrl: `https://source.unsplash.com/featured/?travel,india,${i}`,
      price: 4999 + Math.floor(Math.random() * 4000),
      rating: Math.round((3 + Math.random() * 2) * 10) / 10,
      location: rand(["Goa", "Jaipur", "Ooty", "Manali", "Rishikesh", "Darjeeling"]),
      isSample: true,
      sampleNote: seedNote,
      seedId,
    }));

    // 🌴 Trending Destinations (10)
    const trendingDestinations = Array.from({ length: 10 }, (_, i) => ({
      id: `sample-dest-${i + 1}`,
      name: rand(["Leh-Ladakh", "Rishikesh", "Goa", "Shimla", "Coorg", "Munnar", "Andaman", "Kodaikanal"]),
      imageUrl: `https://source.unsplash.com/featured/?destination,${i}`,
      tag: rand(["Adventure", "Nature", "Romantic", "Hill Station", "Beach"]),
      isSample: true,
      sampleNote: seedNote,
      seedId,
    }));

    // 💥 Promotions (10)
    const promotions = Array.from({ length: 10 }, (_, i) => ({
      id: `promo-${i + 1}`,
      title: rand(["Summer Sale", "Winter Special", "Weekend Getaway", "Luxury Stay Offer"]),
      subtitle: rand([
        "Up to 25% off selected stays.",
        "Free breakfast and late checkout.",
        "Exclusive limited-time travel deals.",
      ]),
      imageUrl: `https://source.unsplash.com/featured/?offer,travel,${i}`,
      buttonText: rand(["Book Now", "Explore", "View Details"]),
      buttonLink: "/bookings",
      isSample: true,
      sampleNote: seedNote,
      seedId,
    }));

    // ⚡ Quick Actions (Static)
    const quickActions = [
      { id: "act-1", label: "Book Flights", icon: "Plane", link: "/flights" },
      { id: "act-2", label: "Train Tickets", icon: "Train", link: "/trains" },
      { id: "act-3", label: "Bus Bookings", icon: "Bus", link: "/buses" },
      { id: "act-4", label: "Hotels", icon: "Building", link: "/hotels" },
    ].map((a) => ({ ...a, isSample: true, sampleNote: seedNote, seedId }));

    // 📰 Stories (15)
    const stories = Array.from({ length: 15 }, (_, i) => ({
      id: `story-${i + 1}`,
      title: rand([
        "Exploring the Hidden Hills",
        "Beach Diaries: A Goa Experience",
        "Adventure Awaits in Rishikesh",
        "Cultural Gems of Jaipur",
      ]),
      author: rand(["Team BharatComfort", "Traveler", "Explorer"]),
      imageUrl: `https://source.unsplash.com/featured/?travel-story,${i}`,
      description: rand([
        "A glimpse into India's offbeat destinations.",
        "Sample article for travel inspiration.",
        "Discover experiences and hidden gems.",
      ]),
      createdAt: now,
      isSample: true,
      sampleNote: seedNote,
      seedId,
    }));

    // 💬 Testimonials (10)
    const testimonials = Array.from({ length: 10 }, (_, i) => ({
      id: `test-${i + 1}`,
      name: rand(["Amit", "Neha", "Rohit", "Ananya", "Ravi", "Priya"]),
      quote: rand([
        "Great platform for booking stays!",
        "Loved the user experience — so simple!",
        "Fantastic travel deals and smooth process.",
      ]),
      avatar: `https://randomuser.me/api/portraits/${rand(["men", "women"])}/${20 + i}.jpg`,
      isSample: true,
      sampleNote: seedNote,
      seedId,
    }));

    const dataMap = {
      featured_listings: featuredListings,
      trending_destinations: trendingDestinations,
      promotions,
      quick_actions: quickActions,
      recent_stories: stories,
      testimonials,
    };

    // Write all sections
    for (const [key, value] of Object.entries(dataMap)) {
      await homepageRef.doc(key).set({ items: value, isSample: true, seedId, updatedAt: now });
    }

    return NextResponse.json({
      success: true,
      message: "✨ Homepage sample data added successfully!",
      seedId,
    });
  } catch (err: any) {
    console.error("❌ Error seeding homepage sample data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
