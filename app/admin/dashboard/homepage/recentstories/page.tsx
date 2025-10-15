"use client";

import { useEffect, useState } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export default function RecentStoriesEditor() {
  const [stories, setStories] = useState<
    { id?: string; title: string; excerpt: string; imageUrl: string; link: string }[]
  >([]);

  const [newStory, setNewStory] = useState({
    title: "",
    excerpt: "",
    imageUrl: "",
    link: "",
  });

  const [file, setFile] = useState<File | null>(null);

  // Fetch stories in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "homepage", "recentstories", "items"),
      (snap) => {
        setStories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      }
    );
    return () => unsub();
  }, []);

  // Upload image
  const handleImageUpload = async () => {
    if (!file) return "";
    const storageRef = ref(storage, `homepage/recentstories/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // Add new story
  const handleAdd = async () => {
    if (!newStory.title) return alert("Enter a title!");
    const imageUrl = file ? await handleImageUpload() : newStory.imageUrl;
    await addDoc(collection(db, "homepage", "recentstories", "items"), {
      ...newStory,
      imageUrl,
    });
    setNewStory({ title: "", excerpt: "", imageUrl: "", link: "" });
    setFile(null);
  };

  // Update existing story
  const handleUpdate = async (id: string, updated: any) => {
    await updateDoc(doc(db, "homepage", "recentstories", "items", id), updated);
  };

  // Delete story
  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "homepage", "recentstories", "items", id));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Manage Recent Stories / Blogs</h1>

      {/* Add new story */}
      <div className="space-y-2 border-b pb-6">
        <Input
          placeholder="Title"
          value={newStory.title}
          onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
        />
        <Textarea
          placeholder="Excerpt"
          value={newStory.excerpt}
          onChange={(e) => setNewStory({ ...newStory, excerpt: e.target.value })}
        />
        <Input
          placeholder="Link (optional, e.g. /blog/story-1)"
          value={newStory.link}
          onChange={(e) => setNewStory({ ...newStory, link: e.target.value })}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button onClick={handleAdd}>Add Story</Button>
      </div>

      {/* Display existing stories */}
      <div className="grid gap-6">
        {stories.map((story) => (
          <div
            key={story.id}
            className="border p-4 rounded-xl bg-white/60 shadow-sm space-y-2"
          >
            {story.imageUrl && (
              <img
                src={story.imageUrl}
                alt={story.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <Input
              value={story.title}
              onChange={(e) =>
                handleUpdate(story.id!, { ...story, title: e.target.value })
              }
            />
            <Textarea
              value={story.excerpt}
              onChange={(e) =>
                handleUpdate(story.id!, { ...story, excerpt: e.target.value })
              }
            />
            <Input
              value={story.link}
              onChange={(e) =>
                handleUpdate(story.id!, { ...story, link: e.target.value })
              }
            />
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => handleDelete(story.id!)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
