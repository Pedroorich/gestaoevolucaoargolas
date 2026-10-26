import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildInitialUserData,
  aprovarUsuario,
  rejeitarUsuario,
  atualizarPerfilUsuario,
  alternarStatusAtivo,
} from '@/lib/firebase/user-service';
import { PerfilUsuario, Usuario } from '@/types/domain';
import { ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

// Mock do Firebase Firestore
vi.mock('@/lib/firebase/client', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _col, id) => ({ id })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  collection: vi.fn((_db, col) => ({ id: col })),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date().toISOString()),
}));

describe('Serviço de Gestão de Usuários (user-service.ts)', () => {
  describe('buildInitialUserData', () => {
    it('deve auto-aprovar o Administrador Geral ph44608@gmail.com com perfil gestao e flag isAdminMaster', () => {
      const userData = buildInitialUserData({
        uid: 'uid-admin-123',
        email: ADMIN_MASTER_EMAIL,
        nome: 'Administrador Master',
        perfilDesejado: 'producao', // Mesmo se pedir outro, admin geral vira gestao
      });

      expect(userData.id).toBe('uid-admin-123');
      expect(userData.email).toBe('ph44608@gmail.com');
      expect(userData.status).toBe('aprovado');
      expect(userData.aprovado).toBe(true);
      expect(userData.isAdminMaster).toBe(true);
      expect(userData.perfil).toBe('gestao');
      expect(userData.ativo).toBe(true);
      expect(userData.aprovadoPor).toBe('sistema-auto');
      expect(userData.aprovadoEm).toBeDefined();
    });

    it('deve cadastrar usuário normal como PENDENTE com aprovado=false aguardando liberação do admin', () => {
      const userData = buildInitialUserData({
        uid: 'uid-user-456',
        email: 'funcionario@evolucao.com.br',
        nome: 'Carlos Operador',
        perfilDesejado: 'producao',
      });

      expect(userData.id).toBe('uid-user-456');
      expect(userData.email).toBe('funcionario@evolucao.com.br');
      expect(userData.status).toBe('pendente');
      expect(userData.aprovado).toBe(false);
      expect(userData.isAdminMaster).toBe(false);
      expect(userData.perfil).toBe('producao');
      expect(userData.ativo).toBe(true);
      expect(userData.aprovadoPor).toBeNull();
      expect(userData.aprovadoEm).toBeNull();
    });
  });

  describe('aprovarUsuario', () => {
    it('deve aprovar usuário atribuindo perfil definitivo e identificando admin aprovador', async () => {
      const result = await aprovarUsuario('uid-user-456', 'logistica', ADMIN_MASTER_EMAIL);
      expect(result.status).toBe('aprovado');
      expect(result.aprovado).toBe(true);
      expect(result.perfil).toBe('logistica');
      expect(result.aprovadoPor).toBe('ph44608@gmail.com');
      expect(result.aprovadoEm).toBeDefined();
    });
  });

  describe('rejeitarUsuario', () => {
    it('deve rejeitar e desativar usuário com motivo especificado', async () => {
      const result = await rejeitarUsuario('uid-user-456', 'Cadastro não reconhecido', ADMIN_MASTER_EMAIL);
      expect(result.status).toBe('rejeitado');
      expect(result.aprovado).toBe(false);
      expect(result.ativo).toBe(false);
      expect(result.motivoRejeicao).toBe('Cadastro não reconhecido');
    });
  });

  describe('atualizarPerfilUsuario e alternarStatusAtivo', () => {
    it('deve atualizar o cargo/perfil de um usuário', async () => {
      const result = await atualizarPerfilUsuario('uid-user-456', 'gestao');
      expect(result.perfil).toBe('gestao');
    });

    it('deve alternar status ativo/inativo', async () => {
      const inativo = await alternarStatusAtivo('uid-user-456', false);
      expect(inativo.ativo).toBe(false);

      const ativo = await alternarStatusAtivo('uid-user-456', true);
      expect(ativo.ativo).toBe(true);
    });
  });

  describe('buscarUsuarioPorEmail e atualizarSenhaUsuario', () => {
    it('deve atualizar a senha do usuário com sucesso', async () => {
      const { atualizarSenhaUsuario } = await import('@/lib/firebase/user-service');
      await expect(atualizarSenhaUsuario('uid-user-456', 'hash-123456')).resolves.toBeUndefined();
    });

    it('deve excluir usuário com sucesso', async () => {
      const { excluirUsuario } = await import('@/lib/firebase/user-service');
      await expect(excluirUsuario('uid-user-dup')).resolves.toBeUndefined();
    });

    it('deve buscar usuário por email retornando null quando não encontrado', async () => {
      const { buscarUsuarioPorEmail } = await import('@/lib/firebase/user-service');
      const resultado = await buscarUsuarioPorEmail('inexistente@empresa.com');
      expect(resultado).toBeNull();
    });
  });
});
