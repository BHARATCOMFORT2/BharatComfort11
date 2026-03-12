/**

* BHARATCOMFORT11
* Booking Lifecycle Engine
  */

export type BookingStatus =
| "pending_payment"
| "confirmed"
| "checked_in"
| "checked_out"
| "cancelled"
| "no_show"
| "payment_failed";

export interface BookingInput {
checkIn: string;
checkOut: string;
pricePerNight: number;
}

export interface BookingCalculation {
nights: number;
totalPrice: number;
}

/* ------------------------------------------
Calculate number of nights + total price
-------------------------------------------*/
export function calculateBookingPrice(
input: BookingInput
): BookingCalculation {
const start = new Date(input.checkIn);
const end = new Date(input.checkOut);

const diff = end.getTime() - start.getTime();

if (diff <= 0) {
throw new Error("Checkout must be after check-in");
}

const nights = Math.ceil(diff / (1000 * 60 * 60 * 24));

return {
nights,
totalPrice: nights * input.pricePerNight,
};
}

/* ------------------------------------------
Validate booking dates
-------------------------------------------*/
export function validateBookingDates(
checkIn: string,
checkOut: string
) {
const start = new Date(checkIn);
const end = new Date(checkOut);

const today = new Date();
today.setHours(0, 0, 0, 0);

if (start < today) {
throw new Error("Check-in cannot be in the past");
}

if (end <= start) {
throw new Error("Checkout must be after check-in");
}

return true;
}

/* ------------------------------------------
Check if date range overlaps
-------------------------------------------*/
export function isDateOverlap(
existingStart: string,
existingEnd: string,
newStart: string,
newEnd: string
) {
const aStart = new Date(existingStart).getTime();
const aEnd = new Date(existingEnd).getTime();
const bStart = new Date(newStart).getTime();
const bEnd = new Date(newEnd).getTime();

return aStart < bEnd && bStart < aEnd;
}

/* ------------------------------------------
Booking status transition guard
-------------------------------------------*/
export function canTransitionStatus(
current: BookingStatus,
next: BookingStatus
): boolean {
const transitions: Record<BookingStatus, BookingStatus[]> = {
pending_payment: ["confirmed", "payment_failed", "cancelled"],
confirmed: ["checked_in", "cancelled", "no_show"],
checked_in: ["checked_out"],
checked_out: [],
cancelled: [],
no_show: [],
payment_failed: [],
};

return transitions[current]?.includes(next) || false;
}

/* ------------------------------------------
Generate booking summary
-------------------------------------------*/
export function createBookingSummary(
listingName: string,
nights: number,
total: number
) {
return {
listingName,
nights,
totalAmount: total,
currency: "INR",
};
}
