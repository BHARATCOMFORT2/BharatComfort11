"use client";

export default function ImageGallery({ images }: { images: string[] }) {
  if (!images || images.length === 0) return <p>No images available</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {images.map((src, i) => (
        <img key={i} src={src} alt={`image-${i}`} className="w-full h-40 object-cover rounded" />
      ))}
    </div>
  );
}
