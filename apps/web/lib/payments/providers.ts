import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { randomDelayMs } from "./util";
import { v4 as uuidv4 } from "uuid";

export type PaymentStatus = "requires_payment" | "succeeded" | "failed" | "refunded";

export interface PaymentsProvider {
  /**
   * Crea un intento de pago asociado a un booking existente.
   * Debe crear un registro en payments con status "requires_payment" y devolver intentId.
   */
  createIntent(bookingId: string): Promise<{ intentId: string }>;

  /**
   * Confirma (captura) el intento. En el proveedor real haría 3DS/confirmación.
   * Aquí simulamos latencia 1–3 s y finalizamos en "succeeded" por defecto.
   * Debe actualizar `payments.status` y, en succeeded, poner `bookings.status = 'paid'`.
   * Puede llamar internamente al webhook simulado.
   */
  confirm(intentId: string): Promise<{ status: PaymentStatus }>;

  /**
   * Reembolsa un pago ya capturado.
   */
  refund(paymentId: string): Promise<{ status: PaymentStatus }>;

  /**
   * Verifica firmas/cuerpo del webhook. Retorna datos normalizados.
   */
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

    // Verifica booking y monta registro en payments
    const { data: booking } = await admin
      .from("bookings")
      .select("id, tenant_id, price_cents, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) throw new Error("booking_not_found");
    if (booking.status === "paid") {
      // Ya pagado: podríamos devolver intent anterior; para simplicidad, error.
      throw new Error("booking_already_paid");
    }

    const intentId = uuidv4();

    const { error } = await admin.from("payments").insert({
      id: intentId, // usamos el mismo id como intentId
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

    // Latencia simulada 1–3 s
    await randomDelayMs(1000, 3000);

    // Leemos el payment
    const { data: payment } = await admin
      .from("payments")
      .select("id, tenant_id, booking_id, status, amount_cents")
      .eq("id", intentId)
      .maybeSingle();

    if (!payment) throw new Error("payment_not_found");
    if (payment.status === "succeeded") return { status: "succeeded" };

    // Simulamos proceso OK => "succeeded"
    const { error: upErr } = await admin
      .from("payments")
      .update({ status: "succeeded" })
      .eq("id", intentId);
    if (upErr) throw upErr;

    // Actualizamos el booking a 'paid'
    const { error: bkErr } = await admin
      .from("bookings")
      .update({ status: "paid" })
      .eq("id", payment.booking_id);
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

    const { error } = await admin
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", paymentId);
    if (error) throw error;

    return { status: "refunded" };
  }

  async verifyWebhook(req: Request): Promise<{ intentId: string; event: "payment_succeeded" | "payment_failed" }> {
    // En el mock aceptamos un header simple como "firma"
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
