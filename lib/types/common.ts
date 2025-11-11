// lib/types/common.ts
export interface Timestamped {
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/* ===== AUTH ===== */
export interface UserSession {
  uid: string;
  email: string;
  role: "user" | "partner" | "admin" | "superadmin";
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

/* ===== BOOKING ===== */
export interface Booking extends Timestamped {
  bookingId: string;
  userId: string;
  partnerId?: string;
  amount: number;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  status: "pending" | "confirmed" | "cancelled" | "completed";
  checkIn?: string;
  checkOut?: string;
}

/* ===== PAYMENT ===== */
export interface Payment extends Timestamped {
  orderId: string;
  userId: string;
  amount: number;
  currency: "INR";
  status: "created" | "captured" | "failed" | "refunded";
}

/* ===== REFUND ===== */
export interface Refund extends Timestamped {
  refundId: string;
  bookingId: string;
  userId: string;
  amount: number;
  mode: string;
  reason?: string;
  invoiceId?: string;
  invoiceUrl?: string;
}

/* ===== PAGINATION ===== */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string | null;
}
