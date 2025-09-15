"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

const demoStories = [
  { id: "1", title: "Exploring Goa’s Beaches", excerpt: "A perfect summer getaway..." },
  { id: "2", title: "Cultural Vibes of Jaipur", excerpt: "A royal experience awaits..." },
];

export default function TopStories() {
  return (
    <section className="py-16 px-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">📰 Top Stories</h2>
      <div className="grid md:grid-cols-2 gap-6">
        {demoStories.map((story) => (
          <Card key={story.id}>
            <CardHeader>{story.title}</CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">{story.excerpt}</p>
              <Link
                href={`/stories/${story.id}`}
                className="text-blue-600 hover:underline mt-3 inline-block"
              >
                Read More →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
