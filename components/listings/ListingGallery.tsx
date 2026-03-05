"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface ListingGalleryProps {
  images?: string[];
}

export default function ListingGallery({ images = [] }: ListingGalleryProps) {

  const safeImages =
    images.length > 0
      ? images
      : ["https://via.placeholder.com/800x600?text=No+Image"];

  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const next = () => {
    setCurrent((prev) => (prev + 1) % safeImages.length);
  };

  const prev = () => {
    setCurrent((prev) =>
      prev === 0 ? safeImages.length - 1 : prev - 1
    );
  };

  return (
    <>
      {/* MAIN IMAGE */}
      <div className="relative w-full h-[400px] rounded-xl overflow-hidden">

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            <Image
              src={safeImages[current]}
              alt="Listing image"
              fill
              sizes="(max-width:768px)100vw,(max-width:1200px)50vw,800px"
              className="object-cover cursor-pointer"
              onClick={() => setFullscreen(true)}
            />
          </motion.div>
        </AnimatePresence>

        {/* NAV BUTTONS */}
        {safeImages.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 px-3 py-2 rounded-lg shadow"
            >
              ←
            </button>

            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 px-3 py-2 rounded-lg shadow"
            >
              →
            </button>
          </>
        )}

      </div>

      {/* THUMBNAILS */}
      {safeImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-3">

          {safeImages.map((img, i) => (
            <div
              key={i}
              className={`relative h-20 rounded-md overflow-hidden cursor-pointer border ${
                current === i ? "border-blue-600" : "border-gray-200"
              }`}
              onClick={() => setCurrent(i)}
            >
              <Image
                src={img}
                alt="thumbnail"
                fill
                className="object-cover"
              />
            </div>
          ))}

        </div>
      )}

      {/* FULLSCREEN MODAL */}
      <AnimatePresence>

        {fullscreen && (
          <motion.div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >

            <div className="relative w-[90%] h-[80%]">

              <Image
                src={safeImages[current]}
                alt="Fullscreen image"
                fill
                className="object-contain"
              />

              {/* CLOSE */}
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 text-white text-2xl"
              >
                ✕
              </button>

              {/* NAV */}
              {safeImages.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-4 top-1/2 text-white text-3xl"
                  >
                    ←
                  </button>

                  <button
                    onClick={next}
                    className="absolute right-4 top-1/2 text-white text-3xl"
                  >
                    →
                  </button>
                </>
              )}

            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </>
  );
}
