"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Story {
  id: string;
  title: string;
  content: string;
  authorId: string;
  coverImage?: string;
  tags?: string[];
  featured?: boolean;
  createdAt?: any;
  [key: string]: any;
}

export function useStories({
  authorId,
  featured,
  limitCount,
}: {
  authorId?: string;
  featured?: boolean;
  limitCount?: number;
} = {}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "stories"), orderBy("createdAt", "desc"));

    if (authorId) {
      q = query(q, where("authorId", "==", authorId));
    }

    if (featured !== undefined) {
      q = query(q, where("featured", "==", featured));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Story)
      );
      setStories(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authorId, featured, limitCount]);

  return { stories, loading };
}
