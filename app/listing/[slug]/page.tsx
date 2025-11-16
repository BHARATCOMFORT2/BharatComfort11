// app/listing/[slug]/page.tsx (server component)
import React from "react";
import { notFound } from "next/navigation";

export default async function ListingPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  // call your public API to fetch listing by slug
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/listings/get?slug=${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  const j = await res.json();
  if (!j.ok) return notFound();
  const listing = j.listing;
  return (
    <main>
      <h1>{listing.title}</h1>
      <p>{listing.description}</p>
      {/* image carousel, booking widget, specs */}
    </main>
  );
}
