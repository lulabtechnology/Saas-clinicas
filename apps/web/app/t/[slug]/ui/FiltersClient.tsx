"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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

  // Estado local para el botón "Aplicar"
  const [sFrom, setSFrom] = useState(from);
  const [sTo, setSTo] = useState(to);
  const [sPro, setSPro] = useState(proId || "");
  const [sStatus, setSStatus] = useState(status || "");

  const apply = () => {
    const q = new URLSearchParams({ tab, from: sFrom, to: sTo });
    if (sPro) q.set("proId", sPro);
    if (sStatus) q.set("status", sStatus);
    router.push(`${basePath}?${q.toString()}` as any);
  };

  return (
    <div className="grid md:grid-cols-5 gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs">Desde</label>
        <input className="border rounded-xl px-3 py-2" type="date" value={sFrom} onChange={e=>setSFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Hasta</label>
        <input className="border rounded-xl px-3 py-2" type="date" value={sTo} onChange={e=>setSTo(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Profesional</label>
        <select className="border rounded-xl px-3 py-2" value={sPro} onChange={e=>setSPro(e.target.value)}>
          <option value="">Todos</option>
          {(pros ?? []).map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs">Estado</label>
        <select className="border rounded-xl px-3 py-2" value={sStatus} onChange={e=>setSStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="confirmed">Confirmadas</option>
          <option value="paid">Pagadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="no_show">No-show</option>
        </select>
      </div>
      <div>
        <Button className="w-full" onClick={apply}>Aplicar</Button>
      </div>
    </div>
  );
}
