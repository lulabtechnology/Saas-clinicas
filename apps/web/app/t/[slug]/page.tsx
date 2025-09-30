export const dynamic = "force-dynamic";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import NextDynamic from "next/dynamic";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const KpiChartsClient = NextDynamic(() => import("./ui/KpiChartsClient"), { ssr: false });
const FiltersClient = NextDynamic(() => import("./ui/FiltersClient"), { ssr: false });

function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

async function getSSRUser() {
  const store = cookies();
  const supa = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data } = await supa.auth.getUser();
  return data.user ?? null;
}

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
    .select("id, name, timezone, slug")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!tenant) {
    return <main className="container py-10">Clínica no encontrada.</main>;
  }

  // Roles/membresía
  const ssrUser = await getSSRUser();
  if (!ssrUser) return <main className="container py-10">Acceso restringido. Inicia sesión.</main>;

  const [{ data: uRow }, { data: member }] = await Promise.all([
    admin.from("users").select("is_platform_admin").eq("id", ssrUser.id).maybeSingle(),
    admin.from("staff").select("role,is_active").eq("tenant_id", tenant.id).eq("user_id", ssrUser.id).maybeSingle(),
  ]);

  const isPlatformAdmin = !!uRow?.is_platform_admin;
  const memberRole = member?.is_active ? (member?.role as "admin" | "staff" | "pro") : null;
  const canSeeTenant = isPlatformAdmin || !!memberRole;
  if (!canSeeTenant) return <main className="container py-10">Acceso denegado a este tenant.</main>;

  const canSeeKpisExport = isPlatformAdmin || memberRole === "admin";

  // Rango por defecto: semana actual
  const today = new Date();
  const defFrom = fmtDate(today);
  const defTo = fmtDate(new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000));

  const from = (searchParams.from || defFrom)!;
  const to = (searchParams.to || defTo)!;
  const proId = searchParams.proId || "";
  const status = searchParams.status || "";

  // Profesionales para filtros
  const { data: pros } = await admin
    .from("professionals")
    .select("id, full_name, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("full_name");

  // Datos calendario
  let bookings: any[] = [];
  {
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

  const norm = (row: any) => {
    const service = Array.isArray(row.services) ? row.services[0]?.name : row.services?.name;
    const pro = Array.isArray(row.professionals) ? row.professionals[0]?.full_name : row.professionals?.full_name;
    return { ...row, service, professional: pro };
  };
  const bookingsNorm = bookings.map(norm);

  const tabs: Array<{ key: "cal" | "kpis" | "export"; label: string; show: boolean }> = [
    { key: "cal", label: "Calendario", show: true },
    { key: "kpis", label: "KPIs", show: canSeeKpisExport },
    { key: "export", label: "Export CSV", show: canSeeKpisExport },
  ];
  const firstAllowed = (tabs.find(t => t.show)?.key) || "cal";
  const activeTab = tabs.find(t => t.key === tab && t.show) ? tab : firstAllowed;

  return (
    <main className="container py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
        <div className="text-xs text-slate-500">
          {isPlatformAdmin ? "Plataforma (admin)" : `Rol clínica: ${memberRole}`}
        </div>
        <div className="flex gap-2">
          <Link href={`/t/${params.slug}/reservar`}>
            <Button>+ Nueva reserva</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.filter(t => t.show).map(t => (
          <TabLink
            key={t.key}
            slug={params.slug}
            tab={t.key}
            current={activeTab}
            from={from}
            to={to}
            proId={proId}
            status={status}
          >
            {t.label}
          </TabLink>
        ))}
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
          tab={activeTab}
        />
      </Card>

      {/* Contenido por tab */}
      {activeTab === "cal" && (
        <Card className="p-4">
          <CalendarList timezone={tenant.timezone} items={bookingsNorm} />
        </Card>
      )}

      {activeTab === "kpis" && (
        <Card className="p-4">
          <KpiChartsClient slug={params.slug} from={from} to={to} proId={proId} />
        </Card>
      )}

      {activeTab === "export" && (
        <Card className="p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Exporta las reservas y pagos entre <b>{from}</b> y <b>{to}</b>.
          </p>
          <a
            className="underline text-blue-600"
            href={`/api/public/export/bookings?slug=${encodeURIComponent(params.slug)}&from=${from}&to=${to}${proId ? `&proId=${proId}` : ""}${status ? `&status=${status}` : ""}`}
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

function CalendarList({ timezone, items }: { timezone: string; items: any[] }) {
  if ((items ?? []).length === 0) return <div className="text-sm text-slate-600">No hay citas en el rango seleccionado.</div>;

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
