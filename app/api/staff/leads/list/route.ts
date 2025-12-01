export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, date, category } = body;

    if (!staffId || !date) {
      return NextResponse.json(
        {
          success: false,
          message: "staffId aur date required hai",
        },
        { status: 400 }
      );
    }

    // ✅ Base query: staff + followupDate
    let query: FirebaseFirestore.Query = adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .where("followupDate", "==", date);

    // ✅ Optional category filter
    if (category && category !== "all") {
      query = query.where("category", "==", category);
    }

    // ✅ Order by createdAt (latest first)
    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();

    const leads = snapshot.docs.map((doc) => {
      const d = doc.data();

      return {
        id: doc.id,
        name: d.name || "",
        businessName: d.businessName || "",
        address: d.address || "",
        phone: d.phone || "",
        contactPerson: d.contactPerson || "",
        email: d.email || "",

        category: d.category || "",
        status: d.status || "new",
        followupDate: d.followupDate || "",

        adminNote: d.adminNote || "",
        dueDate: d.dueDate || null,

        notes: d.notes || [],
        callLogs: d.callLogs || [],

        assignedTo: d.assignedTo || "",
        city: d.city || "",

        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      };
    });

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (error: any) {
    console.error("LEADS LIST API ERROR:", error);

    // ✅ Firestore index error handle (important)
    if (error?.message?.includes("index")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Firestore index missing. Please create the required composite index.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Leads fetch failed",
      },
      { status: 500 }
    );
  }
}
