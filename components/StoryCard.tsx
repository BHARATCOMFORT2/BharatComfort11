import Link from "next/link";
import { motion } from "framer-motion";

interface StayCardProps { id: string; name: string; location: string; price: number; image?: string; }

export default function StayCard({ id, name, location, price, image }: StayCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
      <Link href={`/stays/${id}`}>
        <img src={image || "/placeholder.jpg"} alt={name} className="h-48 w-full object-cover" />
        <div className="p-4">
          <h3 className="font-semibold text-lg">{name}</h3>
          <p className="text-sm text-gray-500">{location}</p>
          <p className="text-indigo-600 font-bold mt-1">₹{price}/night</p>
        </div>
      </Link>
    </motion.div>
  );
}
