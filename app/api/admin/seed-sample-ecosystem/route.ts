export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomSentence() {
  const sentences = [
    "A wonderful experience surrounded by mountains and nature.",
    "Truly a hidden gem for travelers seeking peace.",
    "Excellent service and unforgettable memories.",
    "A perfect getaway for friends and family.",
    "Would definitely visit again!",
  ];
  return rand(sentences);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "seed";
    const seedId = url.searchParams.get("seedId") || makeId();

    if (action === "delete") {
      const collections = ["destinations", "hotels_stays", "featured_listings"];
      let deleted = 0;

      for (const col of collections) {
        const snap = await adminDb.collection(col).where("seedId", "==", seedId).get();
        for (const doc of snap.docs) {
          await doc.ref.delete();
          deleted++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${deleted} sample documents for seedId ${seedId}`,
      });
    }

    const seedNote = "SAMPLE DATA — Demo only";
    const now = new Date();

    const indianPlaces = [
      "Goa", "Manali", "Jaipur", "Udaipur", "Rishikesh", "Shimla", "Coorg", "Ooty", "Leh", "Munnar",
    ];

    // 🏔️ Destinations
    const destinationsCol = adminDb.collection("destinations");
    for (let i = 0; i < 25; i++) {
      const place = rand(indianPlaces);
      const destDoc = destinationsCol.doc();
      await destDoc.set({
        id: destDoc.id,
        name: `${place} ${rand(["Retreat", "Adventure", "Experience", "Getaway"])}`,
        state: rand(["Himachal Pradesh", "Rajasthan", "Goa", "Kerala", "Tamil Nadu"]),
        imageUrl: `https://source.unsplash.com/featured/?${place},travel,${i}`,
        rating: Math.round((3 + Math.random() * 2) * 10) / 10,
        description: `Explore the beauty of ${place}. ${randomSentence()}`,
        bestTimeToVisit: rand(["Oct–Mar", "Apr–Jun", "Year-round"]),
        isSample: true,
        sampleNote: seedNote,
        seedId,
        createdAt: now,
      });

      // add stories subcollection
      const storiesSub = destDoc.collection("stories");
      for (let j = 0; j < 4; j++) {
        await storiesSub.add({
          title: `Traveler Story ${j + 1} in ${place}`,
          author: rand(["Asha", "Rohan", "Priya", "Vikram", "Neha"]),
          storyText: randomSentence() + " [Sample story]",
          imageUrl: `https://source.unsplash.com/featured/?${place},story,${i}${j}`,
          createdAt: now,
          isSample: true,
          sampleNote: seedNote,
          seedId,
        });
      }

      // add reviews subcollection
      const reviewsSub = destDoc.collection("reviews");
      for (let k = 0; k < 5; k++) {
        await reviewsSub.add({
          user: rand(["Arjun", "Meera", "Rahul", "Kavya", "Sandeep"]),
          rating: Math.ceil(Math.random() * 5),
          comment: randomSentence() + " [Sample review]",
          createdAt: now,
          isSample: true,
          sampleNote: seedNote,
          seedId,
        });
      }
    }

    // 🏨 Hotels
    const hotelsCol = adminDb.collection("hotels_stays");
    for (let i = 0; i < 30; i++) {
      const city = rand(indianPlaces);
      const hotelDoc = hotelsCol.doc();
      await hotelDoc.set({
        id: hotelDoc.id,
        name: `${rand(["Hotel", "Resort", "Stay", "Villa"])} ${rand(["Serene", "Oasis", "Haven", "Heights", "Retreat"])} ${city}`,
        city,
        pricePerNight: 4000 + Math.floor(Math.random() * 6000),
        imageUrl: `https://source.unsplash.com/featured/?hotel,${city},${i}`,
        amenities: ["WiFi", "Breakfast", "AC", "Pool", "Parking"],
        rating: Math.round((3 + Math.random() * 2) * 10) / 10,
        available: true,
        isSample: true,
        sampleNote: seedNote,
        seedId,
        createdAt: now,
      });

      // reviews subcollection
      const reviews = hotelDoc.collection("reviews");
      for (let r = 0; r < 6; r++) {
        await reviews.add({
          name: rand(["Karan", "Divya", "Sneha", "Abhay", "Tanya"]),
          rating: Math.ceil(Math.random() * 5),
          comment: randomSentence() + " [Hotel review]",
          isSample: true,
          sampleNote: seedNote,
          seedId,
          createdAt: now,
        });
      }

      // gallery subcollection
      const gallery = hotelDoc.collection("gallery");
      for (let g = 0; g < 5; g++) {
        await gallery.add({
          imageUrl: `https://source.unsplash.com/featured/?hotel-room,${i}${g}`,
          caption: `Sample Room ${g + 1}`,
          isSample: true,
          sampleNote: seedNote,
          seedId,
        });
      }
    }

    // 🌟 Featured listings referencing hotels
    const featuredCol = adminDb.collection("featured_listings");
    for (let i = 0; i < 10; i++) {
      await featuredCol.add({
        title: `Exclusive Offer ${i + 1}`,
        description: "Sample featured stay or package",
        linkedTo: rand(["destination", "hotel"]),
        imageUrl: `https://source.unsplash.com/featured/?luxury,travel,${i}`,
        isSample: true,
        sampleNote: seedNote,
        seedId,
        createdAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: "🌍 Sample ecosystem seeded successfully!",
      seedId,
    });
  } catch (err: any) {
    console.error("❌ Error seeding ecosystem:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
