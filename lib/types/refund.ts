// lib/types/refund.ts
export interface Refund {
  refundId: string;
  bookingId: string;
  userId: string;
  amount: number;
  mode: string;
  reason?: string;
  partnerId?: string | null;
  refundStatus?: string;
  refundMode?: string;
  createdAt?: Date | string;
  processedAt?: Date | string;
  notes?: string;
  invoiceId?: string;   // ✅ added
  invoiceUrl?: string;  // ✅ added
}
