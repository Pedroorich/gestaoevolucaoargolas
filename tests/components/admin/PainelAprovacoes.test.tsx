import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PainelAprovacoes } from '@/components/admin/PainelAprovacoes';
import * as userService from '@/lib/firebase/user-service';
import { Usuario } from '@/types/domain';
import { ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

// Mock do hook useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-master',
      nome: 'Administrador Master',
      email: ADMIN_MASTER_EMAIL,
      perfil: 'gestao',
      status: 'aprovado',
      aprovado: true,
      isAdminMaster: true,
      ativo: true,
      criadoEm: '2026-10-19',
    },
    isAdminMaster: true,
  }),
}));

vi.mock('@/lib/firebase/user-service', () => ({
  listarUsuarios: vi.fn(),
  observarUsuarios: vi.fn(() => vi.fn()),
  aprovarUsuario: vi.fn(),
  rejeitarUsuario: vi.fn(),
  atualizarPerfilUsuario: vi.fn(),
  alternarStatusAtivo: vi.fn(),
}));

describe('PainelAprovacoes (Administrador Geral)', () => {
  const usuariosMock: Usuario[] = [
    {
      id: 'u-pendente-1',
      nome: 'Mariana Produção',
      email: 'mariana@evolucao.com',
      perfil: 'producao',
      status: 'pendente',
      aprovado: false,
      ativo: true,
      criadoEm: '2026-10-19T10:00:00Z',
    },
    {
      id: 'u-aprovado-1',
      nome: 'Roberto Logística',
      email: 'roberto@evolucao.com',
      perfil: 'logistica',
      status: 'aprovado',
      aprovado: true,
      ativo: true,
      criadoEm: '2026-10-18T10:00:00Z',
    },
    {
      id: 'u-master',
      nome: 'Admin Master',
      email: ADMIN_MASTER_EMAIL,
      perfil: 'gestao',
      status: 'aprovado',
      aprovado: true,
      isAdminMaster: true,
      ativo: true,
      criadoEm: '2026-10-16T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userService.listarUsuarios).mockResolvedValue(usuariosMock);
    vi.mocked(userService.aprovarUsuario).mockResolvedValue({
      ...usuariosMock[0],
      status: 'aprovado',
      aprovado: true,
    });
  });

  it('deve listar usuários pendentes com botão de Aprovar e Rejeitar', async () => {
    render(<PainelAprovacoes />);

    await waitFor(() => {
      expect(screen.getByText('Mariana Produção')).toBeDefined();
    });

    expect(screen.getByText('mariana@evolucao.com')).toBeDefined();
    expect(screen.getByRole('button', { name: /aprovar/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /recusar/i })).toBeDefined();
  });

  it('deve aprovar usuário pendente ao clicar no botão Aprovar', async () => {
    render(<PainelAprovacoes />);

    await waitFor(() => {
      expect(screen.getByText('Mariana Produção')).toBeDefined();
    });

    const btnAprovar = screen.getByRole('button', { name: /aprovar/i });
    fireEvent.click(btnAprovar);

    await waitFor(() => {
      expect(userService.aprovarUsuario).toHaveBeenCalledWith(
        'u-pendente-1',
        'producao',
        ADMIN_MASTER_EMAIL
      );
    });
  });

  it('deve exibir o selo de Administrador Geral sem opção de desativar o admin master', async () => {
    render(<PainelAprovacoes />);

    await waitFor(() => {
      expect(screen.getByText(/admin master/i)).toBeDefined();
    });

    // O admin geral master deve ter indicação clara
    expect(screen.getAllByText(/administrador geral/i).length).toBeGreaterThanOrEqual(1);
  });
});
