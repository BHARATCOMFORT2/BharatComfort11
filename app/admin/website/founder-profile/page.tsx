"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase-client";
import { uploadImage } from "@/lib/uploadImage";

interface FounderProfile {
  name: string;
  designation: string;
  shortBio: string;
  detailedBio: string;
  quote: string;
  photoUrl: string;
  email: string;
  linkedin: string;
  isVisible: boolean;
}

export default function FounderProfileAdminPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<FounderProfile>({
    name: "",
    designation: "",
    shortBio: "",
    detailedBio: "",
    quote: "",
    photoUrl: "",
    email: "",
    linkedin: "",
    isVisible: true,
  });

  // 🔹 Fetch existing founder profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/admin/site/founder-profile");
        const json = await res.json();

        if (json?.data) {
          setProfile((prev) => ({ ...prev, ...json.data }));
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load founder profile");
      }
    }
    fetchProfile();
  }, []);

  // 🔹 Upload founder photo
  async function handlePhotoUpload(file: File) {
    try {
      setUploading(true);

      const url = await uploadImage(
  file,
  "website/founder/founder-photo.jpg"
);

setProfile((prev) => ({
  ...prev,
  photoUrl: `${url}?v=${Date.now()}`, // ✅ FIX
}));

      toast.success("Founder photo uploaded");
    } catch (err) {
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  // 🔹 Save profile (ADMIN ONLY)
  async function handleSave() {
    try {
      setLoading(true);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Unauthorized");

      const res = await fetch("/api/admin/site/founder-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      toast.success("Founder profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">
        Founder Profile Settings
      </h1>

      {/* 🖼️ FOUNDER PHOTO */}
      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-medium text-lg">Founder Photo</h2>

        {profile.photoUrl && (
          <img
            src={profile.photoUrl}
            alt="Founder"
            className="w-32 h-32 rounded-full object-cover"
          />
        )}

        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handlePhotoUpload(e.target.files[0]);
            }
          }}
        />

        <p className="text-sm text-gray-500">
          Recommended: Square image, 800×800px or higher
        </p>
      </section>

      {/* BASIC DETAILS */}
      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-medium text-lg">Basic Details</h2>

        <input
          className="input"
          placeholder="Founder Name"
          value={profile.name}
          onChange={(e) =>
            setProfile({ ...profile, name: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="Designation (Founder & CEO)"
          value={profile.designation}
          onChange={(e) =>
            setProfile({ ...profile, designation: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="Official Email"
          value={profile.email}
          onChange={(e) =>
            setProfile({ ...profile, email: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="LinkedIn Profile URL"
          value={profile.linkedin}
          onChange={(e) =>
            setProfile({ ...profile, linkedin: e.target.value })
          }
        />
      </section>

      {/* HOMEPAGE CONTENT */}
      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-medium text-lg">Homepage Content</h2>

        <textarea
          className="textarea"
          rows={3}
          placeholder="Short bio (homepage)"
          value={profile.shortBio}
          onChange={(e) =>
            setProfile({ ...profile, shortBio: e.target.value })
          }
        />

        <input
          className="input"
          placeholder="Founder Quote"
          value={profile.quote}
          onChange={(e) =>
            setProfile({ ...profile, quote: e.target.value })
          }
        />
      </section>

      {/* DETAILED BIO */}
      <section className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-medium text-lg">
          Detailed Profile (About Page)
        </h2>

        <textarea
          className="textarea"
          rows={6}
          placeholder="Founder bio / journey"
          value={profile.detailedBio}
          onChange={(e) =>
            setProfile({ ...profile, detailedBio: e.target.value })
          }
        />
      </section>

      {/* VISIBILITY */}
      <section className="bg-white rounded-xl shadow p-5 flex items-center justify-between">
        <div>
          <h2 className="font-medium">Display on Homepage</h2>
          <p className="text-sm text-gray-500">
            Toggle founder section visibility
          </p>
        </div>

        <input
          type="checkbox"
          checked={profile.isVisible}
          onChange={(e) =>
            setProfile({ ...profile, isVisible: e.target.checked })
          }
        />
      </section>

      {/* ACTION */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
