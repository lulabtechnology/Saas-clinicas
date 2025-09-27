import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import AuthStatus from "@/components/AuthStatus";

export default function HomePage() {
  return (
    <main className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SaaS Clínicas — FASE 2</h1>
          <p className="text-muted-foreground">Auth + Tenant por ruta /t/&lt;slug&gt; + Backoffice protegido</p>
        </div>
        <AuthStatus />
      </div>

      <Card className="p-6 space-y-4">
        <p>Rutas útiles:</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/api/health"><Button variant="outline">/api/health</Button></Link>
          <Link href="/signin"><Button variant="outline">/signin</Button></Link>
          <Link href="/t/demo-clinica"><Button>/t/demo-clinica</Button></Link>
          <Link href="/backoffice"><Button variant="outline">/backoffice</Button></Link>
          <Link href="/api/tools/diag?t=demo-clinica"><Button variant="outline">/api/tools/diag</Button></Link>
        </div>
      </Card>
    </main>
  );
}
