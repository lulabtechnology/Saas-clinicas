import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import NextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const KpiChartsClient = NextDynamic(() => import("./ui/KpiChartsClient"), { ssr: false });
const FiltersClient = NextDynamic(() => import("./ui/FiltersClient"), { ssr: false });

// Util mini
function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

export default async function TenantDashboard({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { tab?: string; from?: string; to?: string; proId?: string; status?: string };
}) {
  const tab = (searchParams.tab || "cal") as "cal" | "kpis" | "export";

  const admin = createSupabaseAdmin();

  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, timezone")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) {
    return <main className="container py-10">Clínica no encontrada.</main>;
  }

  // Rango por defecto: semana actual [hoy, hoy+6]
  const today = new Date();
  const defFrom = fmtDate(today);
  const defTo = fmtDate(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));

  const from = (searchParams.from || defFrom)!;
  const to = (searchParams.to || defTo)!;
  const proId = searchParams.proId || "";
  const status = searchParams.status || "";

  // Profesionales (para filtro)
  const { data: pros } = await admin
    .from("professionals")
    .select("id, full_name, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("full_name");

  // Datos del calendario (server render)
  let bookings: any[] = [];
  if (tab === "cal") {
    const q = admin
      .from("bookings")
      .select(
        "id, scheduled_at, duration_minutes, status, patient_name, patient_phone, services:service_id(name), professionals:professional_id(full_name)"
      )
      .eq("tenant_id", tenant.id)
      .gte("scheduled_at", new Date(from).toISOString())
      .lt("scheduled_at", new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order("scheduled_at", { ascending: true });

    if (proId) q.eq("professional_id", proId);
    if (status) q.eq("status", status);
    const { data } = await q;
    bookings = data ?? [];
  }

  // Normalizar rels (obj/array)
  const norm = (row: any) => {
    const service = Array.isArray(row.services) ? row.services[0]?.name : row.services?.name;
    const pro = Array.isArray(row.professionals) ? row.professionals[0]?.full_name : row.professionals?.full_name;
    return { ...row, service, professional: pro };
  };
  const bookingsNorm = bookings.map(norm);

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <div className="flex gap-2">
          <Link href={`/t/${params.slug}/reservar`}>
            <Button>+ Nueva reserva</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <TabLink slug={params.slug} tab="cal" current={tab} from={from} to={to} proId={proId} status={status}>Calendario</TabLink>
        <TabLink slug={params.slug} tab="kpis" current={tab} from={from} to={to} proId={proId} status={status}>KPIs</TabLink>
        <TabLink slug={params.slug} tab="export" current={tab} from={from} to={to} proId={proId} status={status}>Export CSV</TabLink>
      </div>

      {/* Filtros (client) */}
      <Card className="p-4">
        <FiltersClient
          basePath={`/t/${params.slug}`}
          from={from}
          to={to}
          pros={pros ?? []}
          proId={proId}
          status={status}
          tab={tab}
        />
      </Card>

      {/* Contenido por tab */}
      {tab === "cal" && (
        <Card className="p-4">
          <CalendarList timezone={tenant.timezone} items={bookingsNorm} />
        </Card>
      )}

      {tab === "kpis" && (
        <Card className="p-4">
          <KpiChartsClient slug={params.slug} from={from} to={to} proId={proId} />
        </Card>
      )}

      {tab === "export" && (
        <Card className="p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Exporta las reservas y pagos entre <b>{from}</b> y <b>{to}</b>.
          </p>
          <a
            className="underline text-blue-600"
            href={{
              pathname: `/t/${params.slug}`,
              query: { tab: "export", from, to, ...(proId ? { proId } : {}), ...(status ? { status } : {}) }
            } as any}
          >
            Descargar bookings.csv
          </a>
        </Card>
      )}
    </main>
  );
}

function TabLink({
  slug, tab, current, children, from, to, proId, status
}: {
  slug: string;
  tab: "cal" | "kpis" | "export";
  current: string;
  children: React.ReactNode;
  from: string;
  to: string;
  proId?: string;
  status?: string;
}) {
  const href = {
    pathname: `/t/${slug}`,
    query: { tab, from, to, ...(proId ? { proId } : {}), ...(status ? { status } : {}) }
  } as const;

  const active = current === tab;
  return (
    <Link href={href}>
      <Button variant={active ? "default" : "outline"}>{children}</Button>
    </Link>
  );
}

// Server component simple "agenda"
function CalendarList({ timezone, items }: { timezone: string; items: any[] }) {
  if ((items ?? []).length === 0) return <div className="text-sm text-slate-600">No hay citas en el rango seleccionado.</div>;

  // Agrupar por fecha local
  const groups: Record<string, any[]> = {};
  for (const it of items) {
    const d = new Date(it.scheduled_at);
    const key = d.toISOString().slice(0, 10);
    groups[key] = groups[key] || [];
    groups[key].push(it);
  }

  return (
    <div className="space-y-6">
      {Object.keys(groups).sort().map(day => (
        <div key={day} className="space-y-2">
          <div className="font-semibold">{day}</div>
          <div className="grid gap-2">
            {groups[day].map((b) => (
              <div key={b.id} className="rounded-2xl border p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">
                    <b>{new Date(b.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</b>{" "}
                    · {b.service} · {b.professional ?? "—"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {b.patient_name} — {b.patient_phone}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
