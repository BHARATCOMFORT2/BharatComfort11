"use client";

import { Card, CardContent } from "@/components/ui/Card";

const testimonials = [
  {
    id: 1,
    name: "Rohit Sharma",
    role: "Traveler",
    feedback:
      "BharatComfort made my Goa trip so easy! Booking was seamless and the recommendations were spot on.",
  },
  {
    id: 2,
    name: "Ananya Verma",
    role: "Partner - Hotel Owner",
    feedback:
      "As a partner, I can easily manage my listings and track bookings. The dashboard is super helpful.",
  },
  {
    id: 3,
    name: "David Lee",
    role: "Food Explorer",
    feedback:
      "I found some amazing restaurants in Mumbai thanks to BharatComfort. Definitely using it again!",
  },
];

export default function Testimonials() {
  return (
    <section className="py-16 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">💬 What People Are Saying</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-10">
          Real feedback from users and partners who’ve had amazing experiences
          with BharatComfort.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <Card key={t.id}>
              <CardContent>
                <p className="italic text-gray-700 mb-4">“{t.feedback}”</p>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
