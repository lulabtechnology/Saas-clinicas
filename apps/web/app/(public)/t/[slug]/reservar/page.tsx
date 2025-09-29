export const dynamic = "force-dynamic";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import BookingClient from "./ui/BookingClient";

export default async function ReservarPage({ params }: { params: { slug: string } }) {
  const admin = createSupabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, timezone, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) return <main className="container py-10">Clínica no encontrada.</main>;

  const { data: services } = await admin
    .from("services")
    .select("id, name, price_cents, duration_minutes, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("name");

  const { data: pros } = await admin
    .from("professionals")
    .select("id, full_name, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("full_name");

  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Reservar — {tenant.name}</h1>
      <Card className="p-4">
        <BookingClient
          slug={tenant.slug}
          services={services ?? []}
          pros={pros ?? []}
        />
      </Card>
    </main>
  );
}
