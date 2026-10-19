'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PainelAprovacoes } from '@/components/admin/PainelAprovacoes';
import { canAccessModule } from '@/context/AuthContext';

export default function GestaoUsuariosPage() {
  const { user, perfil, isAdminMaster } = useAuth();

  const autorizado = isAdminMaster || (perfil && canAccessModule(perfil, 'gestao'));

  if (!autorizado) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-red-200 text-center space-y-3">
        <h2 className="text-xl font-bold text-red-600">Acesso Restrito</h2>
        <p className="text-gray-600 text-sm">
          Apenas o Administrador Geral ou gestores têm autorização para gerenciar a equipe e
          aprovações.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-brand-black text-white font-bold rounded-xl text-sm"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/gestao"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-brand-orange transition-colors min-h-[38px] px-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Gestão</span>
        </Link>
      </div>

      <PainelAprovacoes />
    </div>
  );
}
