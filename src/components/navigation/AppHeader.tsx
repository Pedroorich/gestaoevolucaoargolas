'use client';

import React from 'react';
import Link from 'next/link';
import { LogOut, Crown, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AppHeader: React.FC = () => {
  const { user, isAprovado, isAdminMaster, logout } = useAuth();

  return (
    <header className="bg-brand-black text-white px-4 py-3 shadow-md sticky top-0 z-30">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Logomarca */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
          <span className="w-4 h-4 rounded-full bg-brand-orange inline-block shrink-0" />
          <span className="font-extrabold text-lg md:text-xl tracking-tight text-white">
            Evolução Argolas
          </span>
        </Link>

        {/* Informações do Usuário e Ações Rápidas */}
        {isAprovado && user ? (
          <div className="flex items-center gap-2 md:gap-3">
            {/* Atalho exclusivo de aprovações para o Admin Geral */}
            {isAdminMaster && (
              <Link
                href="/gestao/usuarios"
                className="px-2.5 py-1.5 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-black flex items-center gap-1 transition-colors shadow-sm"
                title="Painel de Aprovações e Usuários"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Aprovações</span>
              </Link>
            )}

            {/* Indicador de Sincronização em Tempo Real */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold"
              title="Sincronização em tempo real ativa entre todos os dispositivos"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              <span className="hidden sm:inline">Ao vivo</span>
            </div>

            {/* Identificação de Perfil */}
            <div className="flex items-center gap-1.5 text-xs bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-xl">
              <span className="max-w-[100px] truncate font-semibold text-gray-200 hidden xs:inline">
                {user.nome.split(' ')[0]}
              </span>
              {isAdminMaster ? (
                <span className="px-1.5 py-0.5 bg-brand-orange text-white text-[10px] font-black rounded flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  Admin
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-gray-800 text-gray-300 text-[10px] font-bold rounded uppercase">
                  {user.perfil}
                </span>
              )}
            </div>

            {/* Botão Sair */}
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-800 rounded-full text-gray-300">
            Acesso Seguro
          </span>
        )}
      </div>
    </header>
  );
};
