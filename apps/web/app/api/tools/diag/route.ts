import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  let memberships: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("memberships")
      .select("tenant_id, role, tenants:tenant_id(slug,name)")
      .eq("user_id", user.id);
    memberships = data ?? [];
  }

  // Extraer slug si la URL es /api/tools/diag?t=demo-clinica
  const url = new URL(req.url);
  const testSlug = url.searchParams.get("t") ?? undefined;
  let tenant: any = null;
  if (testSlug && user) {
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, name")
      .eq("slug", testSlug)
      .limit(1)
      .maybeSingle();
    tenant = data ?? null;
  }

  return NextResponse.json({
    ok: true,
    whoami: user ? { id: user.id, email: user.email } : null,
    memberships,
    test_tenant: tenant
  });
}
