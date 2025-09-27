import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaaS Clínicas",
  description: "Reservas y backoffice para clínicas - Multitenant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-dvh bg-background text-foreground">{children}</body>
    </html>
  );
}
