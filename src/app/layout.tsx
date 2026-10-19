import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ConnectivityBanner } from "@/components/ui/ConnectivityBanner";
import { BottomNav } from "@/components/navigation/BottomNav";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AuthGuard } from "@/components/auth/AuthGuard";

export const metadata: Metadata = {
  title: "Evolução Argolas — Sistema de Gestão",
  description: "Sistema de controle de produção, estoque, vendas e lucros da Evolução Argolas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col bg-brand-surface text-brand-black pb-24">
        <AuthProvider>
          <ConnectivityBanner />
          <AppHeader />

          <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6">
            <AuthGuard>{children}</AuthGuard>
          </main>

          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
