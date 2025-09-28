import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  // Seguridad simple por token temporal
  const token = req.headers.get("x-setup-token");
  if (!token || token !== process.env.SETUP_STAFF_TOKEN) {
    return NextResponse.json({ ok: false, error: "Token inválido" }, { status: 401 });
  }

  // Usuario según SSR (cookies)
  const supSSR = createSupabaseServer();
  const { data: { user } } = await supSSR.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "No hay sesión" }, { status: 401 });

  // Admin client (service role) usando LAS MISMAS ENV de la app
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("users").update({ is_platform_admin: true }).eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
