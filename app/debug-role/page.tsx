"use client";

import { auth, db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

export default function DebugRolePage() {
  const [role, setRole] = useState("Loading...");
  const [uid, setUid] = useState("");

  useEffect(() => {
    const check = async () => {
      const user = auth.currentUser;
      if (!user) {
        setRole("No user logged in");
        return;
      }
      setUid(user.uid);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) {
        setRole("User doc not found");
        return;
      }
      const data = snap.data();
      setRole(data.role || "No role field");
    };
    check();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Debug Role</h1>
      <p>User ID: {uid}</p>
      <p>Role: {role}</p>
    </div>
  );
}
