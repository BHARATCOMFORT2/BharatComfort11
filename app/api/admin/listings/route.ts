// app/api/admin/listings/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = auth.split("Bearer ")[1];
    const { adminAuth, adminDb } = getFirebaseAdmin();
    await adminAuth.verifyIdToken(token);

    const snap = await adminDb.collection("listings").get();
    const listings = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ success: true, listings });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
