import { requireTenantRole } from "@/lib/tenant";

export default async function TenantHome({ params }: { params: { slug: string } }) {
  // Cualquier rol miembro puede ver; ejemplo de restricción si quisieras:
  await requireTenantRole(params.slug, ["viewer","pro","admin","owner"]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-medium">Dashboard del Tenant</h2>
      <p className="text-slate-600">
        Aquí verás calendario, KPIs y export (en fases posteriores).
      </p>
    </div>
  );
}
