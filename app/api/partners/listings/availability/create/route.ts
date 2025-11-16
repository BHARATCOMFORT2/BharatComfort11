// app/api/partners/listings/availability/create/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request){ return (req as any).headers?.get ? req.headers.get("authorization") : (req as any).headers?.authorization; }

export async function POST(req: Request) {
  try {
    const auth = getAuthHeader(req);
    if (!auth) return NextResponse.json({ error: "Missing auth"}, {status:401});
    const m = auth.match(/^Bearer (.+)$/); if(!m) return NextResponse.json({error:"Bad header"},{status:401});
    let decoded; try{ decoded = await adminAuth.verifyIdToken(m[1], true); } catch { return NextResponse.json({error:"Invalid token"},{status:401}); }
    const body = await req.json();
    const { listingId, startDate, endDate, note } = body;
    if (!listingId || !startDate || !endDate) return NextResponse.json({ error:"Missing params" }, { status:400 });
    // Verify listing ownership
    const listingSnap = await adminDb.collection("listings").doc(listingId).get();
    if (!listingSnap.exists) return NextResponse.json({ error:"Listing not found" }, { status:404 });
    if (listingSnap.data().partnerUid !== decoded.uid) return NextResponse.json({ error:"Not your listing" }, { status:403 });
    const col = adminDb.collection("listings").doc(listingId).collection("availability");
    const docRef = col.doc();
    await docRef.set({ startDate: new Date(startDate), endDate: new Date(endDate), type:"blocked", note: note||null, createdAt: new Date() });
    return NextResponse.json({ ok:true, id: docRef.id });
  } catch (err:any) { console.error(err); return NextResponse.json({ error: err.message }, { status:500}); }
}
