import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthKey = searchParams.get("month");
  const status = searchParams.get("status") || "pending";
  if (!monthKey) return NextResponse.json({ error: "Missing month" }, { status: 400 });

  const snap = await db
    .collection("referralStatsMonthly")
    .doc(monthKey)
    .collection("users")
    .where("payoutStatus", "==", status)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: "No records" }, { status: 404 });
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
}
