import { describe, it, expect } from 'vitest';
import { getHomeActionsForProfile } from '@/components/dashboard/home-actions';

describe('Ações da Tela Inicial por Perfil (Seção 9.2)', () => {
  it('retorna exatamente as 3 ações grandes para Produção', () => {
    const actions = getHomeActionsForProfile('producao');
    expect(actions.map(a => a.label)).toEqual(['Lançar produção', 'Registrar saída', 'Ver estoque']);
  });

  it('retorna exatamente as 2 ações grandes para Logística', () => {
    const actions = getHomeActionsForProfile('logistica');
    expect(actions.map(a => a.label)).toEqual(['Registrar entrega', 'Entregas pendentes']);
  });

  it('retorna exatamente as 3 ações grandes para Gestão', () => {
    const actions = getHomeActionsForProfile('gestao');
    expect(actions.map(a => a.label)).toEqual(['Painel de lucro', 'Clientes', 'Relatórios']);
  });
});
