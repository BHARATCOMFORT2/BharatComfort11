export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";
import { db } from "@/lib/firebaseadmin";

/**
 POST /api/reviews/add
 */

export async function POST(req: Request) {

  try {

    /* --------------------------
       AUTH
    -------------------------- */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);

    const uid = decoded.uid;

    /* --------------------------
       BODY
    -------------------------- */

    const body = await req.json();

    const {
      listingId,
      bookingId = "",
      rating,
      comment = ""
    } = body;

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId required" },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (comment.length > 1000) {
      return NextResponse.json(
        { error: "Comment too long" },
        { status: 400 }
      );
    }

    /* --------------------------
       DUPLICATE REVIEW CHECK
    -------------------------- */

    const existing = await db
      .collection("reviews")
      .where("listingId", "==", listingId)
      .where("userId", "==", uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "You already submitted a review" },
        { status: 400 }
      );
    }

    /* --------------------------
       CREATE REVIEW
    -------------------------- */

    const docRef = db.collection("reviews").doc();

    await docRef.set({

      id: docRef.id,

      listingId,
      bookingId,

      userId: uid,
      userEmail: decoded.email || "",
      userName: decoded.name || "User",

      rating: Number(rating),
      comment,

      status: "pending",

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

    });

    return NextResponse.json({
      success: true,
      message: "Review submitted for approval",
    });

  } catch (error) {

    console.error("Review API error:", error);

    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );

  }

}
