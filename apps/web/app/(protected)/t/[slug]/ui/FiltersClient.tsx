"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function FiltersClient({
  basePath, from, to, pros, proId, status, tab
}: {
  basePath: string;
  from: string;
  to: string;
  pros: any[];
  proId?: string;
  status?: string;
  tab: string;
}) {
  const router = useRouter();
  const [vFrom, setFrom] = useState(from);
  const [vTo, setTo] = useState(to);
  const [vPro, setPro] = useState(proId || "");
  const [vStatus, setStatus] = useState(status || "");

  const apply = () => {
    const q = new URLSearchParams({ tab, from: vFrom, to: vTo });
    if (vPro) q.set("proId", vPro);
    if (vStatus) q.set("status", vStatus);

    // typedRoutes: castear a Route
    const href = `${basePath}?${q.toString()}` as Route;
    router.push(href);
  };

  return (
    <div className="grid md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="text-sm">Desde</label>
        <Input type="date" value={vFrom} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <label className="text-sm">Hasta</label>
        <Input type="date" value={vTo} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div>
        <label className="text-sm">Profesional</label>
        <select className="border rounded-2xl px-3 py-2 w-full" value={vPro} onChange={(e)=>setPro(e.target.value)}>
          <option value="">Todos</option>
          {pros.map((p:any)=> <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm">Estado</label>
        <select className="border rounded-2xl px-3 py-2 w-full" value={vStatus} onChange={(e)=>setStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="paid">paid</option>
          <option value="attended">attended</option>
          <option value="no_show">no_show</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      <div>
        <Button onClick={apply}>Aplicar</Button>
      </div>
    </div>
  );
}
