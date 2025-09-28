export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supSSR = createSupabaseServer();
    const { data: { user } } = await supSSR.auth.getUser();

    const env = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    let rowSSR: any = null;
    if (user) {
      const { data } = await supSSR.from("users")
        .select("is_platform_admin")
        .eq("id", user.id)
        .maybeSingle();
      rowSSR = data ?? null;
    }

    // Admin (sin RLS) para verificar la verdad en DB
    const admin = createSupabaseAdmin();
    let rowAdmin: any = null;
    if (user) {
      const { data } = await admin.from("users")
        .select("is_platform_admin")
        .eq("id", user.id)
        .maybeSingle();
      rowAdmin = data ?? null;
    }

    return NextResponse.json({
      ok: true,
      env,
      ssrUser: user ? { id: user.id, email: user.email } : null,
      usersRowSSR: rowSSR,
      usersRowAdmin: rowAdmin
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
