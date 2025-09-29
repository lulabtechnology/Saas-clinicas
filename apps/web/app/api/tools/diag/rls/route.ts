export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !anon) {
      return NextResponse.json({ ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY" }, { status: 500 });
    }

    // Cliente ANON (sin usuario)
    const anonClient = createClient(url, anon, { auth: { persistSession: false } });

    // 1) Lectura pública esperada: servicios activos (debería permitir listar en páginas públicas)
    const { data: services, error: sErr } = await anonClient
      .from("services")
      .select("id, name, is_active")
      .eq("is_active", true)
      .limit(3);

    // 2) Lectura restringida esperada: users (debe fallar o venir vacío)
    const { data: users, error: uErr } = await anonClient.from("users").select("id").limit(1);

    return NextResponse.json({
      ok: true,
      services_sample: services ?? [],
      services_error: sErr?.message ?? null,
      users_error_expected: !!uErr, // true = bien (bloqueado por RLS)
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
