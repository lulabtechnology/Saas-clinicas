import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ConfirmacionPage({
  params,
}: {
  params: { slug: string; bookingId: string };
}) {
  const admin = createSupabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) {
    return <main className="container py-10">Clínica no encontrada.</main>;
  }

  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, scheduled_at, status, price_cents, services:service_id(name), professionals:professional_id(full_name)"
    )
    .eq("id", params.bookingId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!booking) {
    return <main className="container py-10">Reserva no encontrada.</main>;
  }

  // Manejo seguro: puede venir como objeto o como array (dependiendo de tipos generados)
  const serviceName = Array.isArray((booking as any).services)
    ? (booking as any).services[0]?.name
    : (booking as any).services?.name;

  const professionalName = Array.isArray((booking as any).professionals)
    ? (booking as any).professionals[0]?.full_name
    : (booking as any).professionals?.full_name;

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">¡Reserva confirmada!</h1>
      <Card className="p-6 space-y-2">
        <div>
          Clínica: <b>{tenant.name}</b>
        </div>
        <div>
          Servicio: <b>{serviceName ?? "—"}</b>
        </div>
        <div>
          Profesional: <b>{professionalName ?? "—"}</b>
        </div>
        <div>
          Fecha/Hora: <b>{new Date(booking.scheduled_at).toLocaleString()}</b>
        </div>
        <div>
          Estado: <b>{booking.status}</b>
        </div>
        <div>
          Total: <b>PAB {(booking.price_cents / 100).toFixed(2)}</b>
        </div>
      </Card>
      <p className="text-sm text-slate-600">
        En Fase 6 enviaremos WhatsApp (MOCK) de confirmación y recordatorios.
      </p>
      <div className="flex gap-3">
        <Link href={`/t/${params.slug}/reservar`}>
          <Button variant="outline">Hacer otra reserva</Button>
        </Link>
        <Link href={`/t/${params.slug}`}>
          <Button>Ir al dashboard</Button>
        </Link>
      </div>
    </main>
  );
}
