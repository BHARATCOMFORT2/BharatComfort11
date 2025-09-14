"use client";

import Link from "next/link";

type StoryCardProps = {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  author: string;
  date: string;
};

export default function StoryCard({
  id,
  title,
  image,
  excerpt,
  author,
  date,
}: StoryCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow hover:shadow-md transition">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-4 space-y-2">
        <h3 className="text-lg font-semibold">
          <Link href={`/stories/${id}`} className="hover:text-blue-600">
            {title}
          </Link>
        </h3>
        <p className="text-gray-600 text-sm">{excerpt}</p>
        <div className="flex justify-between items-center text-sm text-gray-500 pt-2">
          <span>✍ {author}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}
