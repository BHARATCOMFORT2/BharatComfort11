"use client";

type StoryCardProps = {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  author: string;
  date: string;
};

export default function StoryCard({ title, image, excerpt, author, date }: StoryCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition">
      <img src={image} alt={title} className="w-full h-40 object-cover" />
      <div className="p-4">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{excerpt}</p>
        <div className="mt-2 text-xs text-gray-500">
          By {author} • {date}
        </div>
      </div>
    </div>
  );
}
