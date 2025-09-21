"use client";

import { useState } from "react";
import StoryCard from "@/components/stories/StoryCard";

export default function StoriesPage() {
  // Temporary mock stories (replace with Firestore query later)
  const [stories] = useState([
    {
      id: "s1",
      title: "A Luxurious Weekend at Taj Hotel",
      excerpt:
        "My stay at Taj Hotel Mumbai was nothing short of royal. From the view to the service, everything was perfect.",
      author: "Ananya Sharma",
      date: "2025-09-01",
      image: "/images/sample-story-hotel.jpg",
    },
    {
      id: "s2",
      title: "Street Food Adventure in Delhi",
      excerpt:
        "Exploring Chandni Chowk’s food lanes is an experience every foodie must have. Here’s my top picks 🍴.",
      author: "Rahul Mehta",
      date: "2025-08-22",
      image: "/images/sample-story-food.jpg",
    },
    {
      id: "s3",
      title: "Goa Beaches: A Monsoon Escape",
      excerpt:
        "Goa during monsoon is magical — fewer crowds, lush greenery, and peaceful beaches. Highly recommended!",
      author: "Priya Nair",
      date: "2025-07-15",
      image: "/images/sample-story-travel.jpg",
    },
  ]);

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-bold">Travel Stories & Experiences</h1>
        <p className="text-gray-600 mt-2">
          Read inspiring stories, reviews, and experiences from our community.
        </p>
      </header>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {stories.map((story) => (
         <StoryCard key={story.id} {...story} />

        ))}
      </div>
    </div>
  );
}
