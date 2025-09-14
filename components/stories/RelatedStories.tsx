"use client";

import Link from "next/link";

type RelatedStory = {
  id: string;
  title: string;
  image: string;
};

type RelatedStoriesProps = {
  stories: RelatedStory[];
};

export default function RelatedStories({ stories }: RelatedStoriesProps) {
  if (!stories || stories.length === 0) return null;

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">📖 Related Stories</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stories.map((story) => (
          <div
            key={story.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition"
          >
            <img
              src={story.image}
              alt={story.title}
              className="w-full h-40 object-cover"
            />
            <div className="p-4">
              <Link
                href={`/stories/${story.id}`}
                className="text-lg font-semibold hover:text-blue-600"
              >
                {story.title}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
