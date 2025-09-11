"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function UserFavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth/login");
      return;
    }

    try {
      const favRef = collection(db, "users", user.uid, "favorites");
      const snap = await getDocs(favRef);
      const favList: any[] = [];
      snap.forEach((doc) => favList.push({ id: doc.id, ...doc.data() }));
      setFavorites(favList);
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [router]);

  const removeFavorite = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "favorites", id));
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  if (loading) return <p className="text-center py-12">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">My Favorites</h1>

      {favorites.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((fav) => (
            <li
              key={fav.id}
              className="p-4 border rounded-lg shadow bg-white hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold">{fav.name}</h2>
              <p className="text-gray-600">{fav.type}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => router.push(`/listings/${fav.id}`)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </button>
                <button
                  onClick={() => removeFavorite(fav.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No favorites yet ❤️</p>
      )}
    </div>
  );
}
