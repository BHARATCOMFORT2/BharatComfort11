// lib/checkPartnerStatus.ts
import { adminAuth, adminDb } from "./firebaseadmin";

export async function getPartnerStatusFromRequest(req: any) {
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return { auth: false };

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(cookie, true);
  } catch {
    return { auth: false };
  }

  const uid = decoded.uid;

  // Fetch partner profile
  const partnerSnap = await adminDb.collection("partners").doc(uid).get();
  if (!partnerSnap.exists) {
    return { auth: true, partner: false };
  }

  const data = partnerSnap.data();
  return {
    auth: true,
    partner: true,
    status: data.status,
    data,
  };
}
