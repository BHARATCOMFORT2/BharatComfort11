// lib/payments/core.ts
// Universal payments interface (future-ready: Razorpay, Stripe, PayPal...)

export type ProviderName = "razorpay";

export interface CreateArgs {
  amount: number;                 // major units (₹)
  currency?: string;              // default: "INR"
  receipt?: string;
  meta?: Record<string, any>;     // e.g., { context, listingId, userId }
}

export interface CreateResult {
  ok: boolean;
  provider: ProviderName;
  orderId: string;                // provider order/intent id
  amountMinor: number;            // minor units (paise)
  currency: string;
}

export interface VerifyArgs {
  payload: Record<string, any>;   // provider callback payload from client
}

export interface VerifyResult {
  ok: boolean;
  orderId?: string;
  paymentId?: string;
  error?: string;
}

export interface CheckoutClientOptions {
  amount: number;                 
  orderId: string;
  currency: string;
  name: string;
  email: string;
  phone?: string;
  onSuccess: (payload: any) => void;
  onFailure: (payload: any) => void;
}

export interface PaymentProvider {
  name: ProviderName;

  // server-side
  createOrder(args: CreateArgs): Promise<CreateResult>;
  verify(args: VerifyArgs): Promise<VerifyResult>;

  // client-side
  openCheckout(opts: CheckoutClientOptions): void;
}

/* ---------------------------------------------------------
   🔐 Provider Registry (Safe, Typed, Global)
--------------------------------------------------------- */
const registry: Partial<Record<ProviderName, PaymentProvider>> = {};

/** Register payment provider (called by provider files) */
export function registerProvider(provider: PaymentProvider) {
  if (!provider?.name) {
    throw new Error("Cannot register unnamed payment provider");
  }

  // Prevent accidental overwrites
  if (registry[provider.name]) {
    console.warn(
      `⚠️ Payment provider '${provider.name}' is already registered. Overwriting...`
    );
  }

  registry[provider.name] = provider;
}

/** Get provider (Razorpay-only for now) */
export function getProvider(): PaymentProvider {
  const provider = registry["razorpay"];

  if (!provider) {
    throw new Error(
      "Razorpay provider not registered. Make sure you imported '@/lib/payments/providers/razorpay' before calling startPayment()."
    );
  }

  return provider;
}
