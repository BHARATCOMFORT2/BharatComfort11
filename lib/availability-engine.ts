import { getFirebaseAdmin } from "@/lib/firebaseadmin";

const { adminDb } = getFirebaseAdmin();

/* -----------------------------------------
Generate date list between two dates
------------------------------------------*/
export function generateDateRange(start: string, end: string): string[] {
const dates: string[] = [];

const current = new Date(start);
const last = new Date(end);

while (current <= last) {
dates.push(current.toISOString().split("T")[0]);
current.setDate(current.getDate() + 1);
}

return dates;
}

/* -----------------------------------------
Get all booked dates for a listing
------------------------------------------*/
export async function getBookedDates(listingId: string) {
const snap = await adminDb
.collection("bookings")
.where("listingId", "==", listingId)
.where("status", "in", ["confirmed", "checked_in"])
.get();

const bookedDates: string[] = [];

snap.forEach((doc) => {
const data = doc.data();

```
if (!data.checkIn || !data.checkOut) return;

const dates = generateDateRange(data.checkIn, data.checkOut);

bookedDates.push(...dates);
```

});

return Array.from(new Set(bookedDates));
}

/* -----------------------------------------
Get locked dates (payment in progress)
------------------------------------------*/
export async function getLockedDates(listingId: string) {
const snap = await adminDb
.collection("inventory_locks")
.where("listingId", "==", listingId)
.where("status", "==", "locked")
.get();

const lockedDates: string[] = [];

snap.forEach((doc) => {
const data = doc.data();

```
if (!data.checkIn || !data.checkOut) return;

const dates = generateDateRange(data.checkIn, data.checkOut);

lockedDates.push(...dates);
```

});

return Array.from(new Set(lockedDates));
}

/* -----------------------------------------
Get unavailable dates
------------------------------------------*/
export async function getUnavailableDates(listingId: string) {
const booked = await getBookedDates(listingId);
const locked = await getLockedDates(listingId);

return Array.from(new Set([...booked, ...locked]));
}

/* -----------------------------------------
Check if dates are available
------------------------------------------*/
export async function isDateRangeAvailable(
listingId: string,
checkIn: string,
checkOut: string
) {
const unavailable = await getUnavailableDates(listingId);

const requestedDates = generateDateRange(checkIn, checkOut);

for (const d of requestedDates) {
if (unavailable.includes(d)) {
return false;
}
}

return true;
}

/* -----------------------------------------
Get availability calendar
------------------------------------------*/
export async function getAvailabilityCalendar(listingId: string) {
const unavailable = await getUnavailableDates(listingId);

return {
listingId,
unavailableDates: unavailable,
};
}
