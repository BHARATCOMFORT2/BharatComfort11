// hooks/useStory.ts
"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story } from "./useStories";

export function useStory(id: string | null) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "stories", id);
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      if (snapshot.exists()) {
        setStory({ id: snapshot.id, ...snapshot.data() } as Story);
      } else {
        setStory(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  return { story, loading };
}
