'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthScreen } from './AuthScreen';
import { PendingApprovalScreen } from './PendingApprovalScreen';
import { BlockedAccountScreen } from './BlockedAccountScreen';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, firebaseUser, isLoading, isAprovado, recarregarUsuario, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-3 text-center p-6">
        <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
        <span className="text-base font-extrabold text-gray-800">
          Carregando credenciais seguras...
        </span>
        <span className="text-xs text-gray-500">Verificando permissões de acesso da fábrica</span>
      </div>
    );
  }

  // 1. Visitante deslogado: exibe tela de Autenticação (Login / Cadastro)
  if (!user) {
    return <AuthScreen />;
  }

  // 2. Conta desativada ou rejeitada
  if (user.status === 'rejeitado' || user.ativo === false) {
    return (
      <BlockedAccountScreen
        motivo={user.motivoRejeicao}
        onLogout={logout}
      />
    );
  }

  // 3. Usuário cadastrado aguardando aprovação do Admin Geral
  if (!isAprovado || user.status === 'pendente') {
    return (
      <PendingApprovalScreen
        userName={user.nome}
        userEmail={user.email}
        onRefresh={recarregarUsuario}
        onLogout={logout}
      />
    );
  }

  // 4. Usuário autenticado e aprovado pelo admin
  return <>{children}</>;
};
