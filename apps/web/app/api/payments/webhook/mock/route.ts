export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPaymentsProvider } from "@/lib/payments/providers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const provider = getPaymentsProvider();
    const evt = await provider.verifyWebhook(req);

    // Para el mock: si succeeded => asegurar estados
    if (evt.event === "payment_succeeded") {
      const admin = createSupabaseAdmin();

      // Marcar el pago como 'succeeded' si no lo está
      const { data: payment } = await admin
        .from("payments")
        .select("id, booking_id, status")
        .eq("id", evt.intentId)
        .maybeSingle();

      if (payment && payment.status !== "succeeded") {
        await admin.from("payments").update({ status: "succeeded" }).eq("id", evt.intentId);
      }

      // Asegurar booking en 'paid'
      if (payment?.booking_id) {
        await admin.from("bookings").update({ status: "paid" }).eq("id", payment.booking_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }
}
