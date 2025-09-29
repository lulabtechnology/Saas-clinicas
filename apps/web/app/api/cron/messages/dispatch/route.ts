export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getMessagingProvider } from "@/lib/messaging/providers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("x-cron-token");
    const secret = process.env.CRON_SECRET || "";
    if (!secret || token !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    // Tomamos hasta 25 mensajes vencidos
    const { data: due } = await admin
      .from("messages")
      .select("id")
      .eq("status", "queued")
      .lte("to_send_at", new Date().toISOString())
      .order("to_send_at", { ascending: true })
      .limit(25);

    const provider = getMessagingProvider();
    let sent = 0, failed = 0;
    for (const m of due ?? []) {
      try {
        await provider.send(m.id);
        sent++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
