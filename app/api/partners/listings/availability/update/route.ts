export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/* ======================================================
   UPDATE ROOM AVAILABILITY
====================================================== */

export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    /* ---------- BODY ---------- */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { listingId, roomId, availability } = body;

    if (!listingId || !roomId || !Array.isArray(availability)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "listingId, roomId and availability[] are required",
        },
        { status: 400 }
      );
    }

    /* ---------- FETCH LISTING ---------- */
    const ref = adminDb.collection("listings").doc(listingId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const data = snap.data();
    if (data?.partnerId !== uid) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ---------- UPDATE AVAILABILITY ---------- */
    const rooms = Array.isArray(data.rooms) ? data.rooms : [];
    let updated = false;

    const updatedRooms = rooms.map((r: any) => {
      if (r.id !== roomId) return r;

      updated = true;
      return {
        ...r,
        availability: availability.map((d: any) => ({
          date: String(d.date),
          blocked: !!d.blocked,
        })),
      };
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Room not found" },
        { status: 404 }
      );
    }

    await ref.update({
      rooms: updatedRooms,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Availability updated",
    });
  } catch (err: any) {
    console.error("❌ AVAILABILITY UPDATE ERROR:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
