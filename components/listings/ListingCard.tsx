import Link from "next/link";

interface ListingCardProps {
  id: string;
  name: string;
  category: string;
  location: string;
  price: string;
  rating: number;
  image: string;
}

export default function ListingCard({
  id,
  name,
  category,
  location,
  price,
  rating,
  image,
}: ListingCardProps) {
  return (
    <Link href={`/listings/${id}`}>
      <div className="border rounded-lg shadow p-4 bg-white hover:shadow-lg transition cursor-pointer">
        <img
          src={image}
          alt={name}
          className="w-full h-40 object-cover rounded-md mb-4"
        />
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-gray-600">{location}</p>
        <p className="text-sm">{category}</p>
        <p className="font-bold mt-2">₹{price}</p>
        <p className="text-yellow-500">⭐ {rating}</p>
      </div>
    </Link>
  );
}
