"use client";

import { Suspense } from "react";
import ActivityPageClient from "./ActivityPageClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading…</div>}>
      <ActivityPageClient />
    </Suspense>
  );
}
