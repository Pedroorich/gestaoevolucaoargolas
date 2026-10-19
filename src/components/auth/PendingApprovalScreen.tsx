'use client';

import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut, ShieldCheck, Mail } from 'lucide-react';
import { ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

interface PendingApprovalScreenProps {
  userName?: string;
  userEmail?: string;
  onRefresh: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({
  userName,
  userEmail,
  onRefresh,
  onLogout,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsChecking(true);
    setFeedback(null);
    try {
      await onRefresh();
      setFeedback('Status atualizado! Se o admin já liberou, seu acesso iniciará agora.');
    } catch {
      setFeedback('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-xl space-y-6 text-center">
        {/* Ícone de status */}
        <div className="relative w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 bg-brand-orange text-white rounded-full p-1.5 shadow">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Título e apresentação */}
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wider">
            Conta em Análise
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Cadastro Realizado com Sucesso!
          </h2>
          <p className="text-gray-600 text-base">
            Olá, <strong className="text-gray-900">{userName || 'Usuário'}</strong>. Seu cadastro
            foi registrado com segurança em nosso banco de dados.
          </p>
        </div>

        {/* Card informativo de aprovação pelo admin */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">
                Aprovação necessária do Administrador Geral:
              </p>
              <p>
                Por segurança da fábrica, todos os novos acessos precisam ser autorizados pelo
                administrador geral:{' '}
                <strong className="text-amber-900 font-bold underline">
                  {ADMIN_MASTER_EMAIL}
                </strong>
                .
              </p>
            </div>
          </div>
          {userEmail && (
            <div className="text-xs text-gray-500 pt-2 border-t border-amber-200/60">
              Conta logada: <span className="font-mono text-gray-700">{userEmail}</span>
            </div>
          )}
        </div>

        {feedback && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs md:text-sm text-blue-800 font-semibold animate-fade-in">
            {feedback}
          </div>
        )}

        {/* Ações principais */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isChecking}
            className="w-full min-h-[50px] py-3 px-5 rounded-2xl bg-brand-orange text-white font-extrabold hover:bg-orange-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-60 text-base"
          >
            <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verificando...' : 'Verificar se fui aprovado'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span>Sair / Trocar de conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
