import Hero from "@/components/home/Hero";
import QuickActionStrip from "@/components/home/QuickActionStrip";
import FeaturedListings from "@/components/home/FeaturedListings";
import PromotionsStrip from "@/components/home/PromotionsStrip";
import RecentStories from "@/components/home/RecentStories";
import TrendingDestinations from "@/components/home/TrendingDestinations";
import Testimonials from "@/components/home/Testimonials";
import NewsletterSignup from "@/components/home/NewsletterSignup";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16">
      {/* Hero Section */}
      <Hero />

      {/* Quick actions: Book Hotel, Explore Restaurants, Travel Packages */}
      <QuickActionStrip />

      {/* Featured Listings */}
      <section className="container mx-auto px-4">
        <FeaturedListings />
      </section>

      {/* Promotions / Spot Discounts */}
      <section className="container mx-auto px-4">
        <PromotionsStrip />
      </section>

      {/* Recent Stories */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <RecentStories />
        </div>
      </section>

      {/* Trending Destinations */}
      <section className="container mx-auto px-4">
        <TrendingDestinations />
      </section>

      {/* Testimonials */}
      <section className="bg-gray-100 py-12">
        <div className="container mx-auto px-4">
          <Testimonials />
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="bg-indigo-600 text-white py-16">
        <div className="container mx-auto px-4">
          <NewsletterSignup />
        </div>
      </section>
    </div>
  );
}
