import { requireSession, isPlatformAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewTenantPage() {
  await requireSession();
  if (!(await isPlatformAdmin())) redirect("/backoffice");

  return (
    <main className="container py-8 space-y-4">
      <h1 className="text-2xl font-semibold">Crear clínica</h1>
      <Card className="p-6">
        <form action={createTenant} className="grid gap-3">
          <label className="text-sm">Nombre
            <input className="border rounded-2xl px-3 py-2 w-full" name="name" required />
          </label>
          <label className="text-sm">Slug (min 3, solo minúsculas/números/guiones)
            <input className="border rounded-2xl px-3 py-2 w-full" name="slug" pattern="^[a-z0-9-]{3,}$" required />
          </label>
          <label className="text-sm">Time Zone (ej. America/Panama)
            <input className="border rounded-2xl px-3 py-2 w-full" name="timezone" defaultValue="America/Panama" required />
          </label>
          <Button type="submit">Crear</Button>
        </form>
      </Card>
    </main>
  );
}

async function createTenant(formData: FormData) {
  "use server";
  const admin = createSupabaseAdmin();
  const name = String(formData.get("name") || "");
  const slug = String(formData.get("slug") || "");
  const timezone = String(formData.get("timezone") || "America/Panama");
  // Crear tenant y un draft inicial v1
  const { data: t, error } = await admin.from("tenants").insert({
    name, slug, timezone, branding: { primaryColor: "#0ea5e9" }, is_enabled: true
  }).select("id, slug").single();
  if (error) throw error;

  await admin.from("publishes").insert({
    tenant_id: t.id, version: 1, status: "draft", snapshot: {
      clinic: { name, slug, timezone, branding: { primaryColor: "#0ea5e9" } },
      services: [], professionals: [], availability: []
    }
  });

  return redirect(`/backoffice/tenants/${t.slug}`);
}
