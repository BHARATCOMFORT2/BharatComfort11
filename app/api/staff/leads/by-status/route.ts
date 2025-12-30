import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------
   GET LEADS BY STATUS (STAFF)
   status = interested | callback
---------------------------------------- */
export async function GET(req: Request) {
  try {
    /* -------------------------------
       1️⃣ AUTHORIZATION
    -------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(token, true);
    const staffId = decoded.uid;

    /* -------------------------------
       2️⃣ READ QUERY PARAM
    -------------------------------- */
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    if (!status || !["interested", "callback"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    /* -------------------------------
       3️⃣ FIRESTORE QUERY (FIXED)
       ✔ unified collection: leads
       ✔ unified fields
    -------------------------------- */
    let queryRef = adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .where("status", "==", status);

    // 🔥 Callback leads → earliest follow-up first
    if (status === "callback") {
      queryRef = queryRef.orderBy("followupDate", "asc");
    } else {
      queryRef = queryRef.orderBy("updatedAt", "desc");
    }

    const snap = await queryRef.get();

    const leads = snap.docs.map((doc) => {
      const d = doc.data();

      return {
        id: doc.id,
        name: d.name || null,
        businessName: d.businessName || null,
        phone: d.phone || d.mobile || null,
        city: d.city || null,
        status: d.status,
        followupDate: d.followupDate
          ? d.followupDate.toDate().toISOString()
          : null,
        lastNote: d.lastNote || null,
      };
    });

    /* -------------------------------
       4️⃣ RESPONSE
    -------------------------------- */
    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error) {
    console.error("❌ by-status API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads",
      },
      { status: 500 }
    );
  }
}
