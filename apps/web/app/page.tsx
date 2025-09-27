import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">SaaS Clínicas — Base Lista ✅</h1>
        <p className="text-muted-foreground">
          Monorepo con Next.js 14, Tailwind y shadcn/ui. Esta es la FASE 0 (estructura y deploy).
        </p>
        <Card className="p-6 space-y-4">
          <p>Estado de salud del API:</p>
          <div className="flex gap-3">
            <Link href="/api/health">
              <Button variant="default">Probar /api/health</Button>
            </Link>
            <a href="https://vercel.com" target="_blank" rel="noreferrer">
              <Button variant="outline">Abrir Vercel</Button>
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}
