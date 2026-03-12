/**

* BHARATCOMFORT11
* Request Validation Helpers
  */

/* ------------------------------------------
Validate email
-------------------------------------------*/
export function validateEmail(email: string) {
if (!email) throw new Error("Email is required");

const regex =
/^[^\s@]+@[^\s@]+.[^\s@]+$/;

if (!regex.test(email)) {
throw new Error("Invalid email format");
}

return true;
}

/* ------------------------------------------
Validate phone
-------------------------------------------*/
export function validatePhone(phone: string) {
if (!phone) throw new Error("Phone number required");

const cleaned = phone.replace(/\D/g, "");

if (cleaned.length < 10 || cleaned.length > 15) {
throw new Error("Invalid phone number");
}

return true;
}

/* ------------------------------------------
Validate listing id
-------------------------------------------*/
export function validateListingId(listingId: string) {
if (!listingId) {
throw new Error("Listing ID required");
}

if (listingId.length < 5) {
throw new Error("Invalid listing ID");
}

return true;
}

/* ------------------------------------------
Validate booking payload
-------------------------------------------*/
export function validateBookingPayload(payload: any) {
const { listingId, checkIn, checkOut, paymentMode } = payload;

if (!listingId) {
throw new Error("listingId is required");
}

if (!checkIn || !checkOut) {
throw new Error("checkIn and checkOut required");
}

if (
paymentMode &&
!["razorpay", "pay_at_hotel"].includes(paymentMode)
) {
throw new Error("Invalid payment mode");
}

return true;
}

/* ------------------------------------------
Validate price
-------------------------------------------*/
export function validatePrice(price: number) {
if (price === undefined || price === null) {
throw new Error("Price required");
}

if (typeof price !== "number") {
throw new Error("Price must be a number");
}

if (price <= 0) {
throw new Error("Invalid price value");
}

return true;
}

/* ------------------------------------------
Validate booking status
-------------------------------------------*/
export function validateBookingStatus(status: string) {
const allowed = [
"pending_payment",
"confirmed",
"checked_in",
"checked_out",
"cancelled",
"no_show",
"payment_failed",
];

if (!allowed.includes(status)) {
throw new Error("Invalid booking status");
}

return true;
}

/* ------------------------------------------
Validate user id
-------------------------------------------*/
export function validateUserId(uid: string) {
if (!uid) {
throw new Error("User ID required");
}

if (uid.length < 10) {
throw new Error("Invalid user ID");
}

return true;
}
