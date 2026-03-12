/**

* BHARATCOMFORT11
* Price Calculation Engine
  */

import { getNights } from "@/lib/date-utils";

/* ----------------------------------------
Platform configuration
-----------------------------------------*/
const PLATFORM_COMMISSION_RATE = 0.06; // 6%
const DEFAULT_TAX_RATE = 0.12; // 12%

/* ----------------------------------------
Calculate base booking price
-----------------------------------------*/
export function calculateBasePrice(
pricePerNight: number,
checkIn: string,
checkOut: string
) {
const nights = getNights(checkIn, checkOut);

const subtotal = pricePerNight * nights;

return {
nights,
subtotal,
};
}

/* ----------------------------------------
Calculate tax
-----------------------------------------*/
export function calculateTax(amount: number, taxRate = DEFAULT_TAX_RATE) {
const tax = amount * taxRate;

return {
tax,
totalWithTax: amount + tax,
};
}

/* ----------------------------------------
Calculate platform commission
-----------------------------------------*/
export function calculateCommission(amount: number) {
const commission = amount * PLATFORM_COMMISSION_RATE;

return {
commission,
partnerEarning: amount - commission,
};
}

/* ----------------------------------------
Apply discount
-----------------------------------------*/
export function applyDiscount(amount: number, discountPercent: number) {
if (!discountPercent) return amount;

const discount = amount * (discountPercent / 100);

return amount - discount;
}

/* ----------------------------------------
Full booking price breakdown
-----------------------------------------*/
export function calculateBookingPrice({
pricePerNight,
checkIn,
checkOut,
discountPercent = 0,
}: {
pricePerNight: number;
checkIn: string;
checkOut: string;
discountPercent?: number;
}) {
const { nights, subtotal } = calculateBasePrice(
pricePerNight,
checkIn,
checkOut
);

const discounted = applyDiscount(subtotal, discountPercent);

const { tax, totalWithTax } = calculateTax(discounted);

const { commission, partnerEarning } = calculateCommission(discounted);

return {
nights,
subtotal,
discountedAmount: discounted,
tax,
totalAmount: totalWithTax,
commission,
partnerEarning,
};
}
