import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { PendingApprovalScreen } from '@/components/auth/PendingApprovalScreen';
import { BlockedAccountScreen } from '@/components/auth/BlockedAccountScreen';
import { ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

// Mock do hook useAuth
const mockLogin = vi.fn();
const mockCadastrar = vi.fn();
const mockLogout = vi.fn();
const mockRecarregar = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    firebaseUser: null,
    perfil: null,
    statusAprovacao: null,
    isAprovado: false,
    isAdminMaster: false,
    isLoading: false,
    login: mockLogin,
    cadastrar: mockCadastrar,
    logout: mockLogout,
    recarregarUsuario: mockRecarregar,
  }),
}));

describe('Componentes de Autenticação e Segurança', () => {
  describe('AuthScreen', () => {
    it('deve renderizar a aba Entrar por padrão com campos de e-mail e senha', () => {
      render(<AuthScreen />);

      expect(screen.getByRole('heading', { name: /entrar no sistema/i })).toBeDefined();
      expect(screen.getByLabelText(/seu e-mail/i)).toBeDefined();
      expect(screen.getByLabelText(/sua senha/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /acessar sistema/i })).toBeDefined();
    });

    it('deve alternar para a aba Criar Conta ao clicar no botão correspondente', () => {
      render(<AuthScreen />);

      const tabCriarConta = screen.getByRole('button', { name: /criar conta/i });
      fireEvent.click(tabCriarConta);

      expect(screen.getByRole('heading', { name: /cadastre seu acesso/i })).toBeDefined();
      expect(screen.getByLabelText(/nome completo/i)).toBeDefined();
      expect(screen.getByLabelText(/setor \/ área/i)).toBeDefined();
      expect(screen.getByLabelText(/confirmar senha/i)).toBeDefined();
      expect(screen.getByText(/aprovado pelo administrador geral/i)).toBeDefined();
    });

    it('deve alternar a visibilidade da senha ao clicar no botão de olho', () => {
      render(<AuthScreen />);

      const senhaInput = screen.getByLabelText(/sua senha/i) as HTMLInputElement;
      expect(senhaInput.type).toBe('password');

      const btnOlho = screen.getByRole('button', { name: /mostrar senha/i });
      fireEvent.click(btnOlho);
      expect(senhaInput.type).toBe('text');

      fireEvent.click(btnOlho);
      expect(senhaInput.type).toBe('password');
    });
  });

  describe('PendingApprovalScreen', () => {
    it('deve exibir mensagem clara de aguardo de aprovação com o e-mail do admin geral', () => {
      render(
        <PendingApprovalScreen
          userName="Carlos Silva"
          userEmail="carlos@empresa.com"
          onRefresh={mockRecarregar}
          onLogout={mockLogout}
        />
      );

      expect(screen.getByText(/cadastro realizado com sucesso/i)).toBeDefined();
      expect(screen.getByText(new RegExp(ADMIN_MASTER_EMAIL, 'i'))).toBeDefined();
      expect(screen.getByRole('button', { name: /verificar se fui aprovado/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /sair \/ trocar de conta/i })).toBeDefined();
    });

    it('deve acionar onRefresh ao clicar no botão de verificação', () => {
      render(
        <PendingApprovalScreen
          userName="Carlos Silva"
          userEmail="carlos@empresa.com"
          onRefresh={mockRecarregar}
          onLogout={mockLogout}
        />
      );

      const btnRefresh = screen.getByRole('button', { name: /verificar se fui aprovado/i });
      fireEvent.click(btnRefresh);
      expect(mockRecarregar).toHaveBeenCalled();
    });
  });

  describe('BlockedAccountScreen', () => {
    it('deve exibir alerta de conta desativada ou recusada com botão de logout', () => {
      render(
        <BlockedAccountScreen
          motivo="Acesso temporariamente suspenso"
          onLogout={mockLogout}
        />
      );

      expect(screen.getByText(/acesso indisponível/i)).toBeDefined();
      expect(screen.getByText(/acesso temporariamente suspenso/i)).toBeDefined();

      const btnSair = screen.getByRole('button', { name: /sair da conta/i });
      fireEvent.click(btnSair);
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
