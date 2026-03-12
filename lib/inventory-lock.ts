/**

* BHARATCOMFORT11
* Inventory Lock Engine
*
* Prevents double booking during payment
  */

import { getFirebaseAdmin } from "@/lib/firebaseadmin";

const { adminDb } = getFirebaseAdmin();

/* -------------------------------------------
Create temporary inventory lock
--------------------------------------------*/
export async function createInventoryLock(
listingId: string,
checkIn: string,
checkOut: string,
userId: string
) {
const lockRef = adminDb.collection("inventory_locks").doc();

await lockRef.set({
listingId,
checkIn,
checkOut,
userId,
status: "locked",
createdAt: new Date(),
expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min lock
});

return lockRef.id;
}

/* -------------------------------------------
Release inventory lock
--------------------------------------------*/
export async function releaseInventoryLock(lockId: string) {
const lockRef = adminDb.collection("inventory_locks").doc(lockId);

const snap = await lockRef.get();

if (!snap.exists) return;

await lockRef.update({
status: "released",
releasedAt: new Date(),
});
}

/* -------------------------------------------
Confirm inventory lock (booking success)
--------------------------------------------*/
export async function confirmInventoryLock(
lockId: string,
bookingId: string
) {
const lockRef = adminDb.collection("inventory_locks").doc(lockId);

const snap = await lockRef.get();

if (!snap.exists) return;

await lockRef.update({
status: "confirmed",
bookingId,
confirmedAt: new Date(),
});
}

/* -------------------------------------------
Check if listing dates are locked
--------------------------------------------*/
export async function isInventoryLocked(
listingId: string,
checkIn: string,
checkOut: string
) {
const locks = await adminDb
.collection("inventory_locks")
.where("listingId", "==", listingId)
.where("status", "==", "locked")
.get();

for (const doc of locks.docs) {
const data = doc.data();

```
const startA = new Date(data.checkIn).getTime();
const endA = new Date(data.checkOut).getTime();

const startB = new Date(checkIn).getTime();
const endB = new Date(checkOut).getTime();

if (startA < endB && startB < endA) {
  return true;
}
```

}

return false;
}

/* -------------------------------------------
Cleanup expired locks
--------------------------------------------*/
export async function cleanupExpiredLocks() {
const now = new Date();

const snap = await adminDb
.collection("inventory_locks")
.where("status", "==", "locked")
.get();

for (const doc of snap.docs) {
const data = doc.data();

```
if (data.expiresAt && data.expiresAt.toDate
    ? data.expiresAt.toDate() < now
    : new Date(data.expiresAt) < now
) {
  await doc.ref.update({
    status: "expired",
    expiredAt: now,
  });
}
```

}
}
