"use client";

import { useParams } from "next/navigation";
import Image from "next/image";

export default function StoryDetailsPage() {
  const { id } = useParams();

  // Temporary mock story (replace with Firestore later)
  const story = {
    id,
    title: "A Luxurious Weekend at Taj Hotel",
    author: "Ananya Sharma",
    date: "2025-09-01",
    image: "/images/sample-story-hotel.jpg",
    content: `
      My stay at Taj Hotel Mumbai was nothing short of royal. 
      From the sea view suite to the impeccable room service, 
      everything felt like a dream. 

      Highlights:
      - Stunning sunset views 🌅
      - Fine dining experience at the rooftop restaurant 🍷
      - Spa treatment that left me refreshed 💆‍♀️

      Highly recommended for anyone visiting Mumbai!
    `,
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      {/* Title + Meta */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
        <p className="text-gray-600">
          By <span className="font-medium">{story.author}</span> •{" "}
          {new Date(story.date).toLocaleDateString()}
        </p>
      </header>

      {/* Cover Image */}
      <div className="relative w-full h-80 mb-8">
        <Image
          src={story.image}
          alt={story.title}
          fill
          className="object-cover rounded-lg shadow"
        />
      </div>

      {/* Content */}
      <article className="prose prose-lg max-w-none text-gray-800">
        {story.content.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </article>
    </div>
  );
}
