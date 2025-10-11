"use client";

export default function Loading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">
      {message}
    </div>
  );
}
