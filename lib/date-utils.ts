
export function formatDate(date: Date | string): string {
const d = new Date(date);
return d.toISOString().split("T")[0];
}

/* ----------------------------------------
Parse safe date
-----------------------------------------*/
export function parseDate(date: string): Date {
const d = new Date(date);

if (isNaN(d.getTime())) {
throw new Error("Invalid date format");
}

d.setHours(0, 0, 0, 0);
return d;
}

/* ----------------------------------------
Get number of nights
-----------------------------------------*/
export function getNights(checkIn: string, checkOut: string): number {
const start = parseDate(checkIn);
const end = parseDate(checkOut);

const diff = end.getTime() - start.getTime();

if (diff <= 0) {
throw new Error("Checkout must be after check-in");
}

return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ----------------------------------------
Generate date range
-----------------------------------------*/
export function generateDates(checkIn: string, checkOut: string): string[] {
const start = parseDate(checkIn);
const end = parseDate(checkOut);

const dates: string[] = [];

const current = new Date(start);

while (current <= end) {
dates.push(formatDate(current));
current.setDate(current.getDate() + 1);
}

return dates;
}

/* ----------------------------------------
Check date overlap
-----------------------------------------*/
export function isDateOverlap(
aStart: string,
aEnd: string,
bStart: string,
bEnd: string
) {
const startA = parseDate(aStart).getTime();
const endA = parseDate(aEnd).getTime();
const startB = parseDate(bStart).getTime();
const endB = parseDate(bEnd).getTime();

return startA < endB && startB < endA;
}

/* ----------------------------------------
Check if date is past
-----------------------------------------*/
export function isPastDate(date: string): boolean {
const today = new Date();
today.setHours(0, 0, 0, 0);

const d = parseDate(date);

return d < today;
}

/* ----------------------------------------
Validate booking date range
-----------------------------------------*/
export function validateDateRange(checkIn: string, checkOut: string) {
const start = parseDate(checkIn);
const end = parseDate(checkOut);

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
