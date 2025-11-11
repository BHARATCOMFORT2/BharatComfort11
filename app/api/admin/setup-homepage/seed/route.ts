export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

export async function GET() {
  try {
    const homepageRef = adminDb.collection("homepage");

    // 🎯 Featured Listings (displayed as "Featured Trips" in UI)
    const featuredListings = [
      {
        id: "trip-1",
        title: "Manali Adventure Retreat",
        description: "3N/4D stay with river rafting and local sightseeing.",
        imageUrl: "https://images.unsplash.com/photo-1600697085192-90a7b1b00b31?q=80&w=1200",
        price: 7999,
        rating: 4.7,
        location: "Manali, Himachal Pradesh",
      },
      {
        id: "trip-2",
        title: "Jaipur Royal Heritage Stay",
        description: "Experience Rajasthan’s royal charm with palace tours.",
        imageUrl: "https://images.unsplash.com/photo-1608889179866-2c78c637d01f?q=80&w=1200",
        price: 6999,
        rating: 4.8,
        location: "Jaipur, Rajasthan",
      },
      {
        id: "trip-3",
        title: "Goa Beach Escape",
        description: "2N/3D beachfront resort with complimentary breakfast.",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200",
        price: 5999,
        rating: 4.5,
        location: "Goa",
      },
    ];

    // 🌴 Trending Destinations
    const trendingDestinations = [
      {
        id: "dest-1",
        name: "Leh-Ladakh",
        imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200",
        tag: "Adventure",
      },
      {
        id: "dest-2",
        name: "Rishikesh",
        imageUrl: "https://images.unsplash.com/photo-1593629711828-9e1a7d43193d?q=80&w=1200",
        tag: "Spiritual",
      },
      {
        id: "dest-3",
        name: "Kerala Backwaters",
        imageUrl: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200",
        tag: "Nature",
      },
    ];

    // 💥 Promotions
    const promotions = [
      {
        id: "promo-1",
        title: "Winter Getaways 2025",
        subtitle: "Flat 20% off on hill station stays",
        imageUrl: "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=1200",
        buttonText: "Book Now",
        buttonLink: "/bookings",
      },
      {
        id: "promo-2",
        title: "Luxury Hotels Offer",
        subtitle: "Experience 5-star comfort under ₹10,000",
        imageUrl: "https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=1200",
        buttonText: "Explore",
        buttonLink: "/listings",
      },
    ];

    // ⚡ Quick Actions
    const quickActions = [
      { id: "act-1", label: "Book Flights", icon: "Plane", link: "/flights" },
      { id: "act-2", label: "Train Tickets", icon: "Train", link: "/trains" },
      { id: "act-3", label: "Bus Bookings", icon: "Bus", link: "/buses" },
      { id: "act-4", label: "Hotels", icon: "Building", link: "/hotels" },
    ];

    // 📰 Stories
    const recentStories = [
      {
        id: "story-1",
        title: "Exploring Hidden Himachal: Offbeat Gems",
        author: "Team BharatComfort",
        imageUrl: "https://images.unsplash.com/photo-1540206351-d56a99e6a37d?q=80&w=1200",
        description: "Discover untouched villages and serene valleys of Himachal Pradesh.",
        createdAt: new Date(),
      },
      {
        id: "story-2",
        title: "Top 10 Beach Cafes in Goa",
        author: "BharatComfort Editorial",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200",
        description: "From sunrise breakfasts to sundowner cocktails — Goa’s finest beach cafes.",
        createdAt: new Date(),
      },
    ];

    // 💬 Testimonials
    const testimonials = [
      {
        id: "test-1",
        name: "Ananya Verma",
        quote: "Booked our Manali trip via BharatComfort — seamless and affordable!",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg",
      },
      {
        id: "test-2",
        name: "Rahul Patel",
        quote: "Customer support is amazing. Quick responses and great prices.",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg",
      },
    ];

    // 🌍 Write data to Firestore
    const dataMap = {
      featured_listings: featuredListings,
      trending_destinations: trendingDestinations,
      promotions,
      quick_actions: quickActions,
      recent_stories: recentStories,
      testimonials,
    };

    for (const [key, value] of Object.entries(dataMap)) {
      await homepageRef.doc(key).set({ items: value });
    }

    return NextResponse.json({
      success: true,
      message: "✨ Sample homepage data added successfully!",
    });
  } catch (err: any) {
    console.error("❌ Error seeding homepage data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
