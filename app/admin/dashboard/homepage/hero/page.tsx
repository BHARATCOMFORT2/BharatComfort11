"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function HeroEditor() {
  const [hero, setHero] = useState({ title: "", subtitle: "", imageUrl: "" });

  useEffect(() => {
    const fetchHero = async () => {
      const ref = doc(db, "homepage", "hero");
      const snap = await getDoc(ref);
      if (snap.exists()) setHero(snap.data() as any);
    };
    fetchHero();
  }, []);

  const handleSave = async () => {
    await updateDoc(doc(db, "homepage", "hero"), hero);
    alert("✅ Hero updated successfully!");
  };

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Edit Hero Section</h1>

      <Input
        placeholder="Title"
        value={hero.title}
        onChange={(e) => setHero({ ...hero, title: e.target.value })}
      />
      <Input
        placeholder="Subtitle"
        value={hero.subtitle}
        onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
      />
      <Input
        placeholder="Background Image URL"
        value={hero.imageUrl}
        onChange={(e) => setHero({ ...hero, imageUrl: e.target.value })}
      />

      <Button onClick={handleSave} className="w-full">
        Save Changes
      </Button>
    </div>
  );
}
