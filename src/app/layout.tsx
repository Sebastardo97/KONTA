import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FacturaPro - Sistema de Facturación",
  description: "Sistema de facturación moderno con integración DIAN para Colombia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
