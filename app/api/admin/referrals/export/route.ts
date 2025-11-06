import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * 🔹 GET /api/admin/referrals/export
 * Exports monthly referral settlements as CSV
 * Query: ?month=YYYY-MM&status=pending|paid
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthKey = searchParams.get("month");
    const status = searchParams.get("status") || "pending";

    if (!monthKey)
      return NextResponse.json({ error: "Missing month" }, { status: 400 });

    const snap = await adminDb
      .collection("referralStatsMonthly")
      .doc(monthKey)
      .collection("users")
      .where("payoutStatus", "==", status)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: "No records found" }, { status: 404 });
    }

    let csv = "UID,UserType,TotalBooking,TotalReward,PayoutStatus\n";
    snap.forEach((doc) => {
      const d = doc.data();
      csv += `${d.uid},${d.userType},${d.totalBookingAmount},${d.totalReward},${d.payoutStatus}\n`;
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="referral-settlements-${monthKey}.csv"`,
      },
    });
  } catch (err: any) {
    console.error("Error exporting referral settlements:", err);
    return NextResponse.json(
      { error: "Failed to export settlements", details: err.message },
      { status: 500 }
    );
  }
}
