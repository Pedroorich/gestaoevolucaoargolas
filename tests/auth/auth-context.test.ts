import { describe, it, expect } from 'vitest';
import { canAccessModule } from '@/context/AuthContext';

describe('Permissões de Perfil (Regras de Segurança Seção 4 e 7)', () => {
  it('bloqueia módulo de lucro para produção e logística quando não autorizado', () => {
    expect(canAccessModule('producao', 'lucro')).toBe(false);
    expect(canAccessModule('logistica', 'lucro')).toBe(false);
    expect(canAccessModule('gestao', 'lucro')).toBe(true);
  });

  it('permite acesso a lotes e produção para perfil produção e gestão', () => {
    expect(canAccessModule('producao', 'producao')).toBe(true);
    expect(canAccessModule('gestao', 'producao')).toBe(true);
    expect(canAccessModule('logistica', 'producao')).toBe(false);
  });

  it('permite acesso a entregas e vendas para logística e gestão', () => {
    expect(canAccessModule('logistica', 'vendas')).toBe(true);
    expect(canAccessModule('gestao', 'vendas')).toBe(true);
    expect(canAccessModule('producao', 'vendas')).toBe(false);
  });

  it('gestão possui acesso irrestrito a todos os módulos', () => {
    const modulos = ['producao', 'vendas', 'custos', 'lucro', 'clientes', 'relatorios', 'usuarios'];
    for (const mod of modulos) {
      expect(canAccessModule('gestao', mod)).toBe(true);
    }
  });
});
