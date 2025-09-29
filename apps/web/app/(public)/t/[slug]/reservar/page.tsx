import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import BookingFlowClient from "./ui/BookingFlowClient";

export const dynamic = "force-dynamic";

export default async function ReservarPage({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdmin();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, timezone")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) return <main className="container py-10">Clínica no encontrada.</main>;

  const { data: services } = await admin
    .from("services")
    .select("id, name, duration_minutes, price_cents, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("name");

  const { data: pros } = await admin
    .from("professionals")
    .select("id, full_name, specialty, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("full_name");

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">{tenant.name} — Reservar</h1>
      <Card className="p-6">
        <BookingFlowClient
          slug={params.slug}
          services={services ?? []}
          pros={pros ?? []}
        />
      </Card>
    </main>
  );
}
