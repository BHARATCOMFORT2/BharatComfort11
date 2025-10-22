// lib/payments/core.ts
// Universal payments interface (Razorpay-only for now, but future-ready)

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
  amount: number;                 // major units (₹)
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

  // client-side (browser)
  openCheckout(opts: CheckoutClientOptions): void;
}

const registry: Record<ProviderName, PaymentProvider> = {} as any;

export function registerProvider(provider: PaymentProvider) {
  registry[provider.name] = provider;
}

export function getProvider(): PaymentProvider {
  const p = registry["razorpay"];
  if (!p) throw new Error("Payment provider 'razorpay' not registered yet");
  return p;
}
