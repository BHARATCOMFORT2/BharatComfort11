"use client";

import StoryCard from "./StoryCard";

type Story = {
  id: string;
  title: string;
  image: string;
  excerpt: string;
  author: string;
  date: string;
};

type StoryListProps = {
  stories: Story[];
};

export default function StoryList({ stories }: StoryListProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {stories.map((story) => (
        <StoryCard key={story.id} {...story} />
      ))}
    </div>
  );
}
