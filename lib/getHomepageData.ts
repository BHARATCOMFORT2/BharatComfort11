import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export interface HomepageSection {
  title?: string;
  subtitle?: string;
  images?: string[];
}

export async function getHomepageData() {
  const sections = [
    "Hero",
    "QuickActions",
    "FeaturedListings",
    "TrendingDestinations",
    "Promotions",
    "RecentStories",
    "Testimonials",
  ];

  const data: Record<string, HomepageSection> = {};

  for (const section of sections) {
    try {
      const ref = doc(db, "homepage", section);
      const snap = await getDoc(ref);
      data[section] = snap.exists() ? (snap.data() as HomepageSection) : {};
    } catch (e) {
      console.error("Error fetching section:", section, e);
      data[section] = {};
    }
  }

  return data;
}
