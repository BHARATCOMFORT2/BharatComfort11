import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";

/**
 * GET /api/settlements
 * - Admin: lists all settlements
 * - Partner: lists settlements belonging to the logged-in partner
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "partner";

    const settlementsRef = collection(db, "settlements");

    let q;
    if (role === "admin") {
      q = query(settlementsRef, orderBy("createdAt", "desc"));
    } else {
      q = query(
        settlementsRef,
        where("partnerId", "==", uid),
        orderBy("createdAt", "desc")
      );
    }

    const snap = await getDocs(q);
    const settlements = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, settlements });
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settlements
 * - Allows admin to create manual settlement
 * - Body: { partnerId, amount, remark?, status? }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "partner";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can create settlements manually" },
        { status: 403 }
      );
    }

    const { partnerId, amount, remark = "", status = "approved" } =
      await req.json();

    if (!partnerId || !amount) {
      return NextResponse.json(
        { error: "partnerId and amount are required" },
        { status: 400 }
      );
    }

    const settlementsRef = collection(db, "settlements");
    const newDoc = await addDoc(settlementsRef, {
      partnerId,
      amount: Number(amount),
      status,
      remark,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      settlementId: newDoc.id,
    });
  } catch (error) {
    console.error("Error creating settlement:", error);
    return NextResponse.json(
      { error: "Failed to create settlement" },
      { status: 500 }
    );
  }
}
