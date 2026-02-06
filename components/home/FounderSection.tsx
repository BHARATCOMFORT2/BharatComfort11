"use client";

import { useEffect, useState } from "react";

interface FounderProfile {
  name: string;
  designation: string;
  shortBio: string;
  quote: string;
  photoUrl: string;
  isVisible: boolean;
}

export default function FounderSection() {
  const [profile, setProfile] = useState<FounderProfile | null>(null);

  useEffect(() => {
    async function fetchFounder() {
      try {
        const res = await fetch("/api/admin/site/founder-profile");
        const json = await res.json();

        if (json?.data && json.data.isVisible) {
          setProfile(json.data);
        }
      } catch (err) {
        console.error("Failed to load founder profile");
      }
    }

    fetchFounder();
  }, []);

  if (!profile) return null;

  return (
    <section className="bg-gray-50 py-16">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">

        {/* Founder Photo */}
        <div className="flex justify-center md:justify-end">
          <img
            src={profile.photoUrl}
            alt={profile.name}
            className="w-64 h-64 rounded-2xl object-cover shadow-lg"
          />
        </div>

        {/* Founder Content */}
        <div className="space-y-4">
          <h3 className="text-sm uppercase tracking-wide text-gray-500">
            Meet the Founder
          </h3>

          <h2 className="text-3xl font-semibold">
            {profile.name}
          </h2>

          <p className="text-gray-600 font-medium">
            {profile.designation}
          </p>

          <p className="text-gray-700 leading-relaxed">
            {profile.shortBio}
          </p>

          {profile.quote && (
            <blockquote className="border-l-4 border-primary pl-4 italic text-gray-800">
              “{profile.quote}”
            </blockquote>
          )}

          <a
            href="/about"
            className="inline-block mt-4 text-primary font-medium hover:underline"
          >
            Read full story →
          </a>
        </div>
      </div>
    </section>
  );
}
