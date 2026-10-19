'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PerfilUsuario } from '@/types/domain';
import { ProducaoHome } from '@/components/dashboard/ProducaoHome';
import { LogisticaHome } from '@/components/dashboard/LogisticaHome';
import { GestaoHome } from '@/components/dashboard/GestaoHome';
import { UserCheck } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  // Permitimos alternar visualização facilmente neste primeiro momento onde os 4 usuários têm acesso geral
  const [perfilAtivo, setPerfilAtivo] = useState<PerfilUsuario>(user?.perfil || 'gestao');

  return (
    <div className="space-y-6">
      {/* Seletor rápido de visão de perfil para a equipe inicial */}
      <div className="bg-white p-3 rounded-xl border border-gray-300 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
          <UserCheck className="w-4 h-4 text-brand-orange" />
          <span>Visão atual:</span>
        </div>
        <div className="flex gap-1.5">
          {(['gestao', 'producao', 'logistica'] as PerfilUsuario[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPerfilAtivo(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all min-h-[38px] ${
                perfilAtivo === p
                  ? 'bg-brand-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'gestao' ? 'Gestão' : p === 'producao' ? 'Produção' : 'Logística'}
            </button>
          ))}
        </div>
      </div>

      {perfilAtivo === 'producao' && <ProducaoHome />}
      {perfilAtivo === 'logistica' && <LogisticaHome />}
      {perfilAtivo === 'gestao' && <GestaoHome />}
    </div>
  );
}
