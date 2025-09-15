// components/home/RecentStories.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { getFirestore, collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface Story {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
}

export default function RecentStories() {
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const db = getFirestore(app);
        const q = query(collection(db, "stories"), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Story)
        );
        setStories(data);
      } catch (error) {
        console.error("Error fetching stories:", error);
      }
    };

    fetchStories();
  }, []);

  if (stories.length === 0) {
    return null; // Hide section if no stories
  }

  return (
    <div className="w-full px-4 my-8">
      <h2 className="text-lg font-semibold mb-4">📰 Recent Stories & Experiences</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <Link key={story.id} href={`/stories/${story.id}`}>
            <Card className="rounded-xl shadow-md hover:shadow-lg transition cursor-pointer">
              <img
                src={story.imageUrl}
                alt={story.title}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <CardContent className="p-4">
                <h3 className="text-md font-bold">{story.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{story.excerpt}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
