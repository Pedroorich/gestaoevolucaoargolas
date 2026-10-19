'use client';

import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

interface BlockedAccountScreenProps {
  motivo?: string | null;
  onLogout: () => void;
}

export const BlockedAccountScreen: React.FC<BlockedAccountScreenProps> = ({
  motivo,
  onLogout,
}) => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-red-300 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-lg text-center space-y-5">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900">Acesso Indisponível</h2>
          <p className="text-gray-600 text-base">
            Sua conta está desativada ou a solicitação de acesso não foi aprovada pelo
            administrador geral.
          </p>
          {motivo && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              Motivo: {motivo}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
          Caso considere isto um engano, entre em contato com o administrador geral pelo e-mail:{' '}
          <strong className="text-gray-800">{ADMIN_MASTER_EMAIL}</strong>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm text-base"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
};
