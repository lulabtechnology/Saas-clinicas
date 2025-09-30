"use client";

import { useRouter } from "next/navigation";

type Props = {
  basePath: string;
  from: string;
  to: string;
  pros: Array<{ id: string; full_name: string }>;
  proId?: string;
  status?: string;
  tab: "cal" | "kpis" | "export";
};

export default function FiltersClient({ basePath, from, to, pros, proId, status, tab }: Props) {
  const router = useRouter();

  const apply = (next: Partial<{ from: string; to: string; proId: string; status: string }>) => {
    const q = new URLSearchParams({
      tab,
      from: next.from ?? from,
      to: next.to ?? to,
    });
    const vPro = next.proId ?? proId ?? "";
    const vStatus = next.status ?? status ?? "";
    if (vPro) q.set("proId", vPro);
    if (vStatus) q.set("status", vStatus);
    // typedRoutes puede quejarse; forzamos a any
    router.push(`${basePath}?${q.toString()}` as any);
  };

  return (
    <div className="grid md:grid-cols-4 gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs">Desde</label>
        <input className="border rounded-xl px-3 py-2" type="date" value={from} onChange={e=>apply({ from: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Hasta</label>
        <input className="border rounded-xl px-3 py-2" type="date" value={to} onChange={e=>apply({ to: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Profesional</label>
        <select className="border rounded-xl px-3 py-2" value={proId || ""} onChange={e=>apply({ proId: e.target.value })}>
          <option value="">Todos</option>
          {(pros ?? []).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Estado</label>
        <select className="border rounded-xl px-3 py-2" value={status || ""} onChange={e=>apply({ status: e.target.value })}>
          <option value="">Todos</option>
          <option value="confirmed">Confirmadas</option>
          <option value="paid">Pagadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="no_show">No-show</option>
        </select>
      </div>
    </div>
  );
}
