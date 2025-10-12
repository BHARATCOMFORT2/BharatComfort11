// lib/ai-recommendations.ts
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit, doc, getDoc } from "firebase/firestore";
import { getAITravelIdeas } from "@/lib/openai";

export async function getAIRecommendations(user: any) {
  if (!user?.uid) return [];

  try {
    // 1️⃣ Fetch user profile
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // 2️⃣ Fetch recent bookings
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("userId", "==", user.uid), limit(5));
    const bookingSnap = await getDocs(bookingsQuery);

    const pastDestinations = bookingSnap.docs.map((doc) => doc.data().listingName);
    const userInterests = userData?.interests || [];

    // Combine everything for AI context
    const combinedContext = `
User Name: ${userData?.name || "Traveler"}
Past destinations: ${pastDestinations.join(", ") || "none"}
Interests: ${userInterests.join(", ") || "adventure, culture, beaches, hills"}
Preferred travel type: ${userData?.travelType || "mixed"}
`;

    // 3️⃣ Generate AI suggestions
    let aiSuggestions = await getAITravelIdeas(combinedContext);

    // 4️⃣ Fallback (if OpenAI fails)
    if (!aiSuggestions?.length) {
      aiSuggestions = [
        {
          title: "Explore Coorg",
          description: "A peaceful hill station with coffee estates and waterfalls.",
          image: "/ai/coorg.jpg",
        },
        {
          title: "Rann of Kutch",
          description: "Perfect for cultural exploration and the Rann Utsav festival.",
          image: "/ai/kutch.jpg",
        },
        {
          title: "Andaman Islands",
          description: "For your love of beaches and serene getaways.",
          image: "/ai/andaman.jpg",
        },
      ];
    }

    return aiSuggestions;
  } catch (error) {
    console.error("AI recommendation error:", error);
    return [];
  }
}
