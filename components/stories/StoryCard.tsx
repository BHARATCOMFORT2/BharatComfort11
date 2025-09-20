import React from "react";

// Define the shape of a single story
export interface Story {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  image: string;
}

// Props for the StoryCard component
export interface StoryCardProps {
  story: Story;
}

const StoryCard: React.FC<StoryCardProps> = ({ story }) => {
  return (
    <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition p-4 flex flex-col">
      <img
        src={story.image}
        alt={story.title}
        className="w-full h-48 object-cover mb-4 rounded"
      />
      <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
      <p className="text-gray-600 mb-2">{story.excerpt}</p>
      <div className="text-sm text-gray-500 mt-auto">
        By {story.author} | {story.date}
      </div>
    </div>
  );
};

export default StoryCard;
