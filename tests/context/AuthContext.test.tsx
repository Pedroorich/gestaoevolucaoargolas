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
  buildInitialUserData: vi.fn(({ uid, email, nome, perfilDesejado }) => {
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
    };
  }),
  salvarPerfilUsuario: vi.fn(() => Promise.resolve()),
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
});
