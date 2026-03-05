"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { openRazorpayCheckout } from "@/lib/payments-razorpay";

export interface Listing {
  id: string;
  name: string;
  category?: string;
  location: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewsCount?: number;
  images?: string[];
  featured?: boolean;
  instantBooking?: boolean;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {

  const router = useRouter();

  const [user,setUser] = useState<any>(undefined);
  const [loading,setLoading] = useState(false);
  const [currentImage,setCurrentImage] = useState(0);
  const [wishlisted,setWishlisted] = useState(false);

  /* auth listener */

  useEffect(()=>{

    const unsub = auth.onAuthStateChanged((u)=>{

      setUser(u || null)

    })

    return ()=>unsub()

  },[])

  /* images */

  const images = listing.images?.length
  ? listing.images
  : ["https://via.placeholder.com/400x300?text=No+Image"]

  /* slider */

  useEffect(()=>{

    if(images.length <= 1) return

    const timer = setInterval(()=>{

      setCurrentImage((prev)=>(prev+1)%images.length)

    },3500)

    return ()=>clearInterval(timer)

  },[images.length])

  /* navigation */

  const goToDetails = ()=>{

    router.push(`/listing/${listing.id}`)

  }

  /* wishlist toggle */

  const toggleWishlist = ()=>{

    setWishlisted(!wishlisted)

  }

  /* booking */

  const handleBookNow = async()=>{

    if(user === undefined) return

    if(!user){

      router.push(`/login?redirect=/listing/${listing.id}`)
      return

    }

    try{

      setLoading(true)

      const res = await fetch("/api/payments/create-order",{

        method:"POST",

        headers:{
          "Content-Type":"application/json"
        },

        body:JSON.stringify({

          listingId:listing.id,
          amount:listing.price,
          userId:user.uid

        })

      })

      const data = await res.json()

      if(!data.success) throw new Error(data.error)

      openRazorpayCheckout({

        amount:data.amount,
        orderId:data.id,
        name:listing.name,

        email:user.email || "",
        phone:user.phoneNumber || "",

        onSuccess:(res)=>{

          alert(`Payment successful: ${res.razorpay_payment_id}`)

        },

        onFailure:()=>{

          alert("Payment failed")

        }

      })

    }
    catch(err){

      console.error(err)

    }
    finally{

      setLoading(false)

    }

  }

  /* discount */

  const discount =
  listing.originalPrice && listing.originalPrice > listing.price
  ? Math.round(((listing.originalPrice - listing.price)/listing.originalPrice)*100)
  : 0

  return(

<div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition overflow-hidden border flex flex-col">

{/* image section */}

<div className="relative w-full h-56">

<AnimatePresence mode="wait">

<motion.div

key={currentImage}
initial={{opacity:0}}
animate={{opacity:1}}
exit={{opacity:0}}
transition={{duration:0.5}}

className="absolute inset-0"

>

<Image

src={images[currentImage]}
alt={listing.name}
fill
sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
className="object-cover"

/>

</motion.div>

</AnimatePresence>

{/* badges */}

{listing.featured && (

<span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">

⭐ Featured

</span>

)}

{listing.instantBooking && (

<span className="absolute top-2 left-24 bg-green-600 text-white text-xs px-2 py-1 rounded">

⚡ Instant

</span>

)}

{discount > 0 && (

<span className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">

-{discount}%

</span>

)}

{/* wishlist */}

<button

onClick={toggleWishlist}

className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow"

>

{wishlisted ? "❤️" : "🤍"}

</button>

</div>

{/* content */}

<div className="p-4 flex flex-col flex-grow">

<h3

onClick={goToDetails}

className="font-semibold text-lg text-gray-800 cursor-pointer hover:text-blue-700"

>

{listing.name}

</h3>

<p className="text-gray-600 text-sm">

{listing.location}

</p>

{listing.category && (

<p className="text-gray-500 text-sm">

{listing.category}

</p>

)}

{/* rating */}

{listing.rating && (

<p className="text-yellow-600 text-sm mt-1">

⭐ {listing.rating}

{listing.reviewsCount && ` (${listing.reviewsCount})`}

</p>

)}

{/* price */}

<div className="mt-3 flex items-center justify-between">

<div>

<p className="text-blue-600 font-bold">

₹{listing.price}

</p>

{listing.originalPrice && listing.originalPrice > listing.price && (

<p className="text-gray-400 line-through text-sm">

₹{listing.originalPrice}

</p>

)}

</div>

</div>

{/* buttons */}

<div className="flex gap-2 mt-4">

<button

onClick={goToDetails}

className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg"

>

Visit

</button>

<button

onClick={handleBookNow}

disabled={loading || user===undefined}

className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg"

>

{loading ? "Processing..." : "Book Now"}

</button>

</div>

</div>

</div>

  )

}
