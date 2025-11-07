// app/api/reports/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db, admin } from "@/lib/firebaseadmin";

/**
 * GET /api/reports
 * Admin reports dashboard metrics.
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can access reports" },
        { status: 403 }
      );
    }

    // ===== Collect Data =====
    const [bookingsSnap, partnersSnap, settlementsSnap] = await Promise.all([
      db.collection("bookings").get(),
      db.collection("partners").get(),
      db.collection("settlements").get(),
    ]);

    // Totals
    const totalBookings = bookingsSnap.size;
    const totalPartners = partnersSnap.size;
    const totalSettlements = settlementsSnap.size;

    const totalRevenue = bookingsSnap.docs.reduce((sum, doc) => {
      const amt = Number(doc.data().amount || 0);
      return sum + amt;
    }, 0);

    // ===== Last 7 days bookings =====
    const today = new Date();
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return { date: d.toISOString().slice(0, 10), bookings: 0, revenue: 0 };
    });

    bookingsSnap.docs.forEach((doc) => {
      const b = doc.data();
      const createdAt =
        b.createdAt?.toDate?.() ||
        (b.date ? new Date(b.date) : new Date(b.createdAt || Date.now()));
      const dateKey = createdAt.toISOString().slice(0, 10);
      const day = last7.find((d) => d.date === dateKey);
      if (day) {
        day.bookings += 1;
        day.revenue += Number(b.amount || 0);
      }
    });

    // ===== Last 30 days settlements =====
    const last30 = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return { date: d.toISOString().slice(0, 10), settlements: 0, amount: 0 };
    });

    settlementsSnap.docs.forEach((doc) => {
      const s = doc.data();
      const createdAt =
        s.createdAt?.toDate?.() ||
        (s.date ? new Date(s.date) : new Date(s.createdAt || Date.now()));
      const dateKey = createdAt.toISOString().slice(0, 10);
      const day = last30.find((d) => d.date === dateKey);
      if (day) {
        day.settlements += 1;
        day.amount += Number(s.amount || 0);
      }
    });

    // ===== Response =====
    return NextResponse.json({
      success: true,
      summary: {
        totalBookings,
        totalPartners,
        totalSettlements,
        totalRevenue,
      },
      charts: {
        last7Bookings: last7.reverse(),
        last30Settlements: last30.reverse(),
      },
    });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
