"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";

interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}

export default function PromotionsStrip() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const db = getFirestore(app);
        const snapshot = await getDocs(collection(db, "promotions"));
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Promotion)
        );
        setPromotions(data);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };

    fetchPromotions();
  }, []);

  if (promotions.length === 0) {
    return null; // Hide if no promotions available
  }

  return (
    <div className="w-full px-4 my-8">
      <h2 className="text-lg font-semibold mb-4">🔥 Trending Promotions</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {promotions.map((promo) => (
          <Card
            key={promo.id}
            className="min-w-[280px] max-w-[300px] rounded-xl shadow-md flex-shrink-0"
          >
            <img
              src={promo.imageUrl}
              alt={promo.title}
              className="w-full h-40 object-cover rounded-t-xl"
            />
            <CardContent className="p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-md font-bold">{promo.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {promo.description}
                </p>
              </div>
              <Button
                variant="link"
                className="mt-2 flex items-center text-blue-600"
                onClick={() => (window.location.href = promo.link)}
              >
                Explore <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
