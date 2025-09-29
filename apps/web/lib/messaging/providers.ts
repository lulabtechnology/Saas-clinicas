import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { confirmationTemplate, reminderTemplate } from "./templates";
import { randomDelayMs } from "@/lib/payments/util";

export interface MessagingProvider {
  enqueueConfirmation(bookingId: string): Promise<{ messageId: string }>;
  scheduleReminder(bookingId: string, toSendAtISO: string, hoursBefore: number): Promise<{ messageId: string }>;
  send(messageId: string): Promise<{ ok: true }>;
}

export function getMessagingProvider(): MessagingProvider {
  const provider = (process.env.MESSAGING_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "mock":
      return new MockMessagingProvider();
    default:
      throw new Error(`MESSAGING_PROVIDER no soportado: ${provider}`);
  }
}

class MockMessagingProvider implements MessagingProvider {
  async enqueueConfirmation(bookingId: string) {
    const admin = createSupabaseAdmin();
    // obtenemos tenant_id del booking
    const { data: bk } = await admin
      .from("bookings")
      .select("id, tenant_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!bk) throw new Error("booking_not_found");

    const { data, error } = await admin
      .from("messages")
      .insert({
        tenant_id: bk.tenant_id,
        booking_id: bookingId,
        provider: "mock",
        type: "confirmation",
        status: "queued",
        to_send_at: new Date().toISOString(),
        payload: {}
      })
      .select("id")
      .single();
    if (error) throw error;

    return { messageId: data.id as string };
  }

  async scheduleReminder(bookingId: string, toSendAtISO: string, hoursBefore: number) {
    const admin = createSupabaseAdmin();
    const { data: bk } = await admin
      .from("bookings")
      .select("id, tenant_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!bk) throw new Error("booking_not_found");

    const { data, error } = await admin
      .from("messages")
      .insert({
        tenant_id: bk.tenant_id,
        booking_id: bookingId,
        provider: "mock",
        type: "reminder",
        status: "queued",
        to_send_at: toSendAtISO,
        payload: { hoursBefore }
      })
      .select("id")
      .single();
    if (error) throw error;

    return { messageId: data.id as string };
  }

  /**
   * Envía un mensaje (siempre "éxito" en MOCK) y marca como sent.
   * Compone el texto a partir del contexto del booking.
   */
  async send(messageId: string) {
    const admin = createSupabaseAdmin();
    // Traer el mensaje + booking + tenant + service + professional
    const { data: msg } = await admin
      .from("messages")
      .select("id, tenant_id, booking_id, type, status, payload")
      .eq("id", messageId)
      .maybeSingle();
    if (!msg) throw new Error("message_not_found");
    if (msg.status !== "queued") return { ok: true };

    const { data: ctx } = await admin
      .from("bookings")
      .select("id, scheduled_at, services:service_id(name), professionals:professional_id(full_name), tenants:tenant_id(name, slug, timezone)")
      .eq("id", msg.booking_id)
      .maybeSingle();
    if (!ctx) throw new Error("booking_context_not_found");

    // Normalizar nombres (por si vienen como arrays)
    const serviceName = Array.isArray((ctx as any).services) ? (ctx as any).services[0]?.name : (ctx as any).services?.name;
    const proName = Array.isArray((ctx as any).professionals) ? (ctx as any).professionals[0]?.full_name : (ctx as any).professionals?.full_name;
    const clinic = (ctx as any).tenants?.name || "Clínica";
    const slug = (ctx as any).tenants?.slug || "clinic";
    const whenLocal = new Date(ctx.scheduled_at).toLocaleString(); // suficiente para MOCK
    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/t/${slug}/confirmacion/${ctx.id}`;

    let text = "";
    if (msg.type === "confirmation") {
      text = confirmationTemplate({
        clinic, service: serviceName ?? "Servicio", professional: proName ?? "Profesional",
        whenLocal, bookingId: ctx.id, confirmUrl
      });
    } else {
      const hoursBefore = Number((msg.payload as any)?.hoursBefore ?? 0);
      text = reminderTemplate({
        clinic, service: serviceName ?? "Servicio", professional: proName ?? "Profesional",
        whenLocal, hoursBefore, confirmUrl
      });
    }

    // Simular latencia de envío
    await randomDelayMs(300, 1200);

    // Guardar "envío" (MOCK): marcamos sent y guardamos preview
    const { error } = await admin
      .from("messages")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        payload: { ...(msg.payload || {}), preview: text }
      })
      .eq("id", msg.id);
    if (error) {
      await admin.from("messages").update({ status: "failed", last_error: error.message }).eq("id", msg.id);
      throw error;
    }

    return { ok: true as const };
  }
}
