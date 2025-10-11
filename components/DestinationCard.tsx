import Link from "next/link";
import { motion } from "framer-motion";

interface DestinationCardProps { id: string; title: string; state: string; image?: string; }

export default function DestinationCard({ id, title, state, image }: DestinationCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
      <Link href={`/destinations/${id}`}>
        <img src={image || "/placeholder.jpg"} alt={title} className="h-48 w-full object-cover" />
        <div className="p-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-gray-500">{state}</p>
        </div>
      </Link>
    </motion.div>
  );
}
