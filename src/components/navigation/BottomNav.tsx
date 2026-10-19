'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ArrowLeft, Factory, Truck, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { perfil, isAprovado } = useAuth();

  if (!isAprovado) {
    return null;
  }

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const isHome = pathname === '/';

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-200 shadow-lg px-2 py-2 safe-area-pb"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {!isHome && (
          <button
            type="button"
            onClick={handleBack}
            className="flex flex-col items-center justify-center p-2 text-brand-black hover:text-brand-orange min-h-[48px] min-w-[48px] rounded-xl active:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs font-bold mt-1">Voltar</span>
          </button>
        )}

        <Link
          href="/"
          className={`flex flex-col items-center justify-center p-2 min-h-[48px] min-w-[48px] rounded-xl active:bg-gray-100 ${
            isHome ? 'text-brand-orange font-bold' : 'text-brand-black'
          }`}
        >
          <Home className="w-6 h-6" aria-hidden="true" />
          <span className="text-xs mt-1">Início</span>
        </Link>

        {(perfil === 'producao' || perfil === 'gestao') && (
          <Link
            href="/producao"
            className={`flex flex-col items-center justify-center p-2 min-h-[48px] min-w-[48px] rounded-xl active:bg-gray-100 ${
              pathname.startsWith('/producao') ? 'text-brand-orange font-bold' : 'text-brand-black'
            }`}
          >
            <Factory className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1">Fábrica</span>
          </Link>
        )}

        {(perfil === 'logistica' || perfil === 'gestao') && (
          <Link
            href="/vendas"
            className={`flex flex-col items-center justify-center p-2 min-h-[48px] min-w-[48px] rounded-xl active:bg-gray-100 ${
              pathname.startsWith('/vendas') ? 'text-brand-orange font-bold' : 'text-brand-black'
            }`}
          >
            <Truck className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1">Logística</span>
          </Link>
        )}

        {perfil === 'gestao' && (
          <Link
            href="/gestao"
            className={`flex flex-col items-center justify-center p-2 min-h-[48px] min-w-[48px] rounded-xl active:bg-gray-100 ${
              pathname.startsWith('/gestao') ? 'text-brand-orange font-bold' : 'text-brand-black'
            }`}
          >
            <BarChart3 className="w-6 h-6" aria-hidden="true" />
            <span className="text-xs mt-1">Gestão</span>
          </Link>
        )}
      </div>
    </nav>
  );
};
