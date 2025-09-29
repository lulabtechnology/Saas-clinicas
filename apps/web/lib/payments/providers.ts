import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { randomDelayMs } from "./util";
// ⬇️ Reemplaza uuid por crypto.randomUUID
import { randomUUID } from "crypto";

export type PaymentStatus = "requires_payment" | "succeeded" | "failed" | "refunded";

export interface PaymentsProvider {
  createIntent(bookingId: string): Promise<{ intentId: string }>;
  confirm(intentId: string): Promise<{ status: PaymentStatus }>;
  refund(paymentId: string): Promise<{ status: PaymentStatus }>;
  verifyWebhook(req: Request): Promise<{ intentId: string; event: "payment_succeeded" | "payment_failed" }>;
}

export function getPaymentsProvider(): PaymentsProvider {
  const provider = (process.env.PAYMENTS_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "mock":
      return new MockPaymentsProvider();
    default:
      throw new Error(`PAYMENTS_PROVIDER no soportado: ${provider}`);
  }
}

class MockPaymentsProvider implements PaymentsProvider {
  async createIntent(bookingId: string): Promise<{ intentId: string }> {
    const admin = createSupabaseAdmin();

    const { data: booking } = await admin
      .from("bookings")
      .select("id, tenant_id, price_cents, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) throw new Error("booking_not_found");
    if (booking.status === "paid") throw new Error("booking_already_paid");

    // ⬇️ Genera el id con crypto
    const intentId = randomUUID();

    const { error } = await admin.from("payments").insert({
      id: intentId,
      tenant_id: booking.tenant_id,
      booking_id: booking.id,
      amount_cents: booking.price_cents,
      provider: "mock",
      status: "requires_payment"
    });
    if (error) throw error;

    return { intentId };
  }

  async confirm(intentId: string): Promise<{ status: PaymentStatus }> {
    const admin = createSupabaseAdmin();
    await randomDelayMs(1000, 3000);

    const { data: payment } = await admin
      .from("payments")
      .select("id, tenant_id, booking_id, status, amount_cents")
      .eq("id", intentId)
      .maybeSingle();

    if (!payment) throw new Error("payment_not_found");
    if (payment.status === "succeeded") return { status: "succeeded" };

    const { error: upErr } = await admin.from("payments").update({ status: "succeeded" }).eq("id", intentId);
    if (upErr) throw upErr;

    const { error: bkErr } = await admin.from("bookings").update({ status: "paid" }).eq("id", payment.booking_id);
    if (bkErr) throw bkErr;

    return { status: "succeeded" };
  }

  async refund(paymentId: string): Promise<{ status: PaymentStatus }> {
    const admin = createSupabaseAdmin();

    const { data: payment } = await admin
      .from("payments")
      .select("id, booking_id, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment) throw new Error("payment_not_found");
    if (payment.status !== "succeeded") throw new Error("only_succeeded_can_refund");

    await randomDelayMs(500, 1500);

    const { error } = await admin.from("payments").update({ status: "refunded" }).eq("id", paymentId);
    if (error) throw error;

    return { status: "refunded" };
  }

  async verifyWebhook(req: Request): Promise<{ intentId: string; event: "payment_succeeded" | "payment_failed" }> {
    const secret = process.env.PAYMENT_MOCK_WEBHOOK_SECRET || "mock-secret";
    const sig = req.headers.get("x-mock-signature");
    if (sig !== secret) throw new Error("invalid_signature");

    const body = await req.json().catch(() => ({}));
    const intentId = body?.intentId as string | undefined;
    const event = (body?.event as any) || "payment_succeeded";
    if (!intentId) throw new Error("missing_intentId");

    return { intentId, event };
  }
}
