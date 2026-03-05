"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

export default function AdminReviewsPage() {

  const [reviews,setReviews] = useState<any[]>([]);
  const [user,setUser] = useState<any>(null);
  const [loading,setLoading] = useState(true);

  /* -------------------------
     AUTH
  -------------------------- */

  useEffect(()=>{

    const unsub = auth.onAuthStateChanged((u)=>{
      setUser(u);
    });

    return ()=>unsub();

  },[]);

  /* -------------------------
     FETCH PENDING REVIEWS
  -------------------------- */

  useEffect(()=>{

    const q = query(
      collection(db,"reviews"),
      where("status","==","pending")
    );

    const unsub = onSnapshot(q,(snap)=>{

      const data = snap.docs.map(d=>({
        id:d.id,
        ...d.data()
      }));

      setReviews(data);
      setLoading(false);

    });

    return ()=>unsub();

  },[]);

  /* -------------------------
     APPROVE / REJECT
  -------------------------- */

  const updateReview = async(id:string,action:"approve"|"reject")=>{

    if(!user) return alert("Login required");

    const token = await user.getIdToken();

    const reason =
      action === "reject"
        ? prompt("Reject reason?") || ""
        : "";

    const res = await fetch("/api/reviews/approve",{

      method:"POST",

      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`
      },

      body:JSON.stringify({
        id,
        action,
        reason
      })

    });

    const data = await res.json();

    alert(data.success ? "Updated successfully" : data.error);

  };

  /* -------------------------
     UI
  -------------------------- */

  if(loading){

    return(
      <div className="p-10 text-center">
        Loading reviews...
      </div>
    )

  }

  return(

<div className="max-w-5xl mx-auto p-6">

<h1 className="text-2xl font-bold mb-6">

Review Moderation

</h1>

{reviews.length === 0 && (

<p className="text-gray-500">

No pending reviews.

</p>

)}

<div className="space-y-4">

{reviews.map((r)=>(
<div
key={r.id}
className="border rounded-xl p-4 bg-white shadow"
>

<div className="flex justify-between mb-2">

<p className="font-semibold">

{r.userName || "Guest"}

</p>

<p className="text-yellow-500">

{"★".repeat(r.rating)}

</p>

</div>

<p className="text-gray-600 mb-3">

{r.comment}

</p>

<div className="flex gap-3">

<button
onClick={()=>updateReview(r.id,"approve")}
className="bg-green-600 text-white px-3 py-1 rounded"
>

Approve

</button>

<button
onClick={()=>updateReview(r.id,"reject")}
className="bg-red-600 text-white px-3 py-1 rounded"
>

Reject

</button>

</div>

</div>
))}

</div>

</div>

  )

}
