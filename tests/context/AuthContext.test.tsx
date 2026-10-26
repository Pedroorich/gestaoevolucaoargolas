import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import * as security from '@/lib/auth/security';

// Mock do Firebase Auth
const mockSignIn = vi.fn();
const mockCreateUser = vi.fn();
const mockSignOut = vi.fn();
let authCallback: ((user: any) => void) | null = null;

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (_auth: any, callback: any) => {
    authCallback = callback;
    return vi.fn(); // unsubscribe
  },
  getAuth: vi.fn(() => ({})),
}));

vi.mock('@/lib/firebase/client', () => ({
  auth: {},
  db: {},
}));

vi.mock('@/lib/firebase/user-service', () => ({
  buildInitialUserData: vi.fn(({ uid, email, nome, perfilDesejado, passwordHash }) => {
    const isMaster = email.toLowerCase().includes('ph44608@gmail.com');
    return {
      id: uid,
      email,
      nome,
      perfil: isMaster ? 'gestao' : perfilDesejado || 'producao',
      status: isMaster ? 'aprovado' : 'pendente',
      aprovado: isMaster,
      isAdminMaster: isMaster,
      ativo: true,
      criadoEm: new Date().toISOString(),
      aprovadoPor: isMaster ? 'sistema-auto' : null,
      aprovadoEm: isMaster ? new Date().toISOString() : null,
      passwordHash,
    };
  }),
  salvarPerfilUsuario: vi.fn(() => Promise.resolve()),
  atualizarSenhaUsuario: vi.fn(() => Promise.resolve()),
  buscarUsuarioPorEmail: vi.fn(() => Promise.resolve(null)),
  buscarUsuarioPorId: vi.fn((uid) =>
    Promise.resolve({
      id: uid,
      nome: 'Teste',
      email: 'teste@evolucao.com',
      perfil: 'producao',
      status: 'pendente',
      aprovado: false,
      ativo: true,
      criadoEm: '2026-10-19',
    })
  ),
}));

describe('AuthContext com Segurança e Aprovação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('inicia com usuário null e desautenticado caso não haja sessão', () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    act(() => {
      if (authCallback) authCallback(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.isAprovado).toBe(false);
    expect(result.current.isAdminMaster).toBe(false);
  });

  it('deve registrar usuário com senha fraca gerando erro e sem chamar o Firebase', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await expect(
      result.current.cadastrar('Carlos Silva', 'carlos@empresa.com', 'fraca', 'producao')
    ).rejects.toThrow();

    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('deve criar usuário regular como pendente', async () => {
    mockCreateUser.mockResolvedValueOnce({
      user: { uid: 'uid-carlos', email: 'carlos@empresa.com' },
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    let createdUser: any;
    await act(async () => {
      createdUser = await result.current.cadastrar(
        'Carlos Silva',
        'carlos@empresa.com',
        'Forte@2026!',
        'producao'
      );
    });

    expect(mockCreateUser).toHaveBeenCalled();
    expect(createdUser.status).toBe('pendente');
    expect(createdUser.aprovado).toBe(false);
  });

  it('deve identificar o login de ph44608@gmail.com como Admin Geral Master', async () => {
    mockCreateUser.mockResolvedValueOnce({
      user: { uid: 'uid-admin-master', email: 'ph44608@gmail.com' },
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    let createdAdmin: any;
    await act(async () => {
      createdAdmin = await result.current.cadastrar(
        'Pedro Admin',
        'ph44608@gmail.com',
        'Argolas@2026Master!',
        'gestao'
      );
    });

    expect(createdAdmin.status).toBe('aprovado');
    expect(createdAdmin.aprovado).toBe(true);
    expect(createdAdmin.isAdminMaster).toBe(true);
  });

  it('deve permitir que usuário regular aprovado faça login com credenciais corretas', async () => {
    const { buscarUsuarioPorEmail } = await import('@/lib/firebase/user-service');
    const { hashPassword } = await import('@/lib/auth/security');

    const senhaCorreta = 'SenhaForte@2026!';
    const passHash = await hashPassword(senhaCorreta);

    const usuarioAprovado = {
      id: 'usr-aprovado-1',
      nome: 'Marco Aurélio',
      email: 'marco@evolucao.com',
      perfil: 'gestao' as const,
      status: 'aprovado' as const,
      aprovado: true,
      ativo: true,
      criadoEm: '2026-10-26T10:00:00.000Z',
      passwordHash: passHash,
    };

    vi.mocked(buscarUsuarioPorEmail).mockResolvedValueOnce(usuarioAprovado);
    mockSignIn.mockRejectedValueOnce({ code: 'auth/configuration-not-found' });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await act(async () => {
      await result.current.login('marco@evolucao.com', senhaCorreta);
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.email).toBe('marco@evolucao.com');
    expect(result.current.isAprovado).toBe(true);
    expect(result.current.perfil).toBe('gestao');
  });

  it('deve rejeitar login com senha incorreta para conta aprovada', async () => {
    const { buscarUsuarioPorEmail } = await import('@/lib/firebase/user-service');
    const { hashPassword } = await import('@/lib/auth/security');

    const passHash = await hashPassword('SenhaCorreta@2026!');

    const usuarioAprovado = {
      id: 'usr-aprovado-2',
      nome: 'Pedro Teste',
      email: 'pedro@evolucao.com',
      perfil: 'producao' as const,
      status: 'aprovado' as const,
      aprovado: true,
      ativo: true,
      criadoEm: '2026-10-26T10:00:00.000Z',
      passwordHash: passHash,
    };

    vi.mocked(buscarUsuarioPorEmail).mockResolvedValueOnce(usuarioAprovado);
    mockSignIn.mockRejectedValueOnce({ code: 'auth/invalid-credential' });

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await expect(
      result.current.login('pedro@evolucao.com', 'SenhaErrada@999!')
    ).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('deve impedir recadastro de e-mail já cadastrado e aprovado', async () => {
    const { buscarUsuarioPorEmail } = await import('@/lib/firebase/user-service');

    const usuarioExistente = {
      id: 'usr-existente',
      nome: 'Marco Existente',
      email: 'marco@existente.com',
      perfil: 'gestao' as const,
      status: 'aprovado' as const,
      aprovado: true,
      ativo: true,
      criadoEm: '2026-10-26T10:00:00.000Z',
      passwordHash: 'hash-mock',
    };

    vi.mocked(buscarUsuarioPorEmail).mockResolvedValueOnce(usuarioExistente);

    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await expect(
      result.current.cadastrar('Marco', 'marco@existente.com', 'SenhaNova@2026!', 'gestao')
    ).rejects.toThrow('Este e-mail já está cadastrado e aprovado');
  });

  it('deve deslogar usuário ao acionar logout', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.firebaseUser).toBeNull();
    expect(result.current.isAprovado).toBe(false);
  });
});
