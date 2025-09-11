"use client";

type StoryDetailProps = {
  title: string;
  image: string;
  author: string;
  date: string;
  content: string;
};

export default function StoryDetail({
  title,
  image,
  author,
  date,
  content,
}: StoryDetailProps) {
  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <img src={image} alt={title} className="w-full h-72 object-cover rounded-lg shadow" />
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex justify-between text-sm text-gray-500">
        <span>✍ {author}</span>
        <span>{date}</span>
      </div>
      <div className="prose prose-lg max-w-none">
        <p>{content}</p>
      </div>
    </article>
  );
}
