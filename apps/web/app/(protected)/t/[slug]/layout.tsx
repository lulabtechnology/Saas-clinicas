import { requireTenant } from "@/lib/tenant";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function TenantLayout({
  children,
  params
}: { children: ReactNode; params: { slug: string } }) {
  const t = await requireTenant(params.slug);

  return (
    <div className="container py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t.name}</h1>
          <p className="text-sm text-slate-600">Tenant: {t.slug} · Rol: {t.role}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/"><Button variant="outline">Inicio</Button></Link>
          <Link href="/backoffice"><Button variant="outline">Backoffice</Button></Link>
        </div>
      </div>
      <hr />
      {children}
    </div>
  );
}
