"use client";

import { useState } from "react";
import { Loader2, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SeedSampleButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSeed = async () => {
    if (!confirm("⚠️ This will generate sample data (homepage + listings). Continue?")) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      // Step 1: Homepage sample
      const homeRes = await fetch("/api/admin/seed-homepage-sample?action=seed");
      const homeJson = await homeRes.json();

      if (!homeRes.ok) throw new Error(homeJson.error || "Homepage seeding failed.");

      // Step 2: Ecosystem sample (destinations, hotels, etc.)
      const ecoRes = await fetch("/api/admin/seed-sample-ecosystem?action=seed");
      const ecoJson = await ecoRes.json();

      if (!ecoRes.ok) throw new Error(ecoJson.error || "Ecosystem seeding failed.");

      setMessage(
        `✅ Sample data generated successfully!\nHomepage Seed ID: ${homeJson.seedId}\nEcosystem Seed ID: ${ecoJson.seedId}`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while seeding sample data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-sm">
      <h2 className="text-lg font-semibold text-yellow-800 flex items-center gap-2 mb-2">
        <Database className="w-5 h-5" />
        Generate Sample Data
      </h2>
      <p className="text-sm text-yellow-900 mb-4">
        This will seed your Firestore with sample homepage, destinations, hotels, reviews & stories.
        <br />
        All entries will include <code>isSample</code> and <code>seedId</code> so they can be deleted safely.
      </p>

      <Button
        onClick={handleSeed}
        disabled={loading}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin w-4 h-4 mr-2" /> Seeding...
          </>
        ) : (
          "Generate Sample Data"
        )}
      </Button>

      {message && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 mt-0.5" />
          <pre className="whitespace-pre-wrap text-sm">{message}</pre>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
