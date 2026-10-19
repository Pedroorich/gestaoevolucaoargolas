import { describe, it, expect } from 'vitest';
import { toCents, toReais, formatBRL, calculateUnitCost } from '@/lib/money';
import { CATALOGO_MODELOS } from '@/types/domain';
import { firebaseConfig } from '@/lib/firebase/config';
import { canAccessModule } from '@/context/AuthContext';
import { getHomeActionsForProfile } from '@/components/dashboard/home-actions';

describe('Validação Integrada da Fase 1 (Critérios de Aceite)', () => {
  it('1. Catálogo de modelos contém exatamente os 7 modelos aprovados na Fase 0', () => {
    expect(CATALOGO_MODELOS).toHaveLength(7);
    const nomes = CATALOGO_MODELOS.map((m) => m.nome);
    expect(nomes).toContain('Argola 16mm');
    expect(nomes).toContain('Argola 19mm');
    expect(nomes).toContain('Argola 19mm c/ Corrente');
    expect(nomes).toContain('Argola 22mm');
    expect(nomes).toContain('Argola 22mm Batida');
    expect(nomes).toContain('Argola 22mm c/ Corrente');
    expect(nomes).toContain('Argola 25mm');
  });

  it('2. Todas as regras financeiras garantem centavos inteiros', () => {
    const centavos = toCents(149.90);
    expect(centavos).toBe(14990);
    expect(toReais(centavos)).toBe(149.9);
    expect(formatBRL(centavos).replace(/\u00a0/g, ' ')).toBe('R$ 149,90');

    // Custo unitário de um lote: R$ 500,00 gastos para 10.000 unidades
    const custoUnitario = calculateUnitCost(toCents(500.0), 10000);
    expect(custoUnitario).toBe(5); // 5 centavos por argola
  });

  it('3. Configuração do Firebase aponta para o projeto oficial', () => {
    expect(firebaseConfig.projectId).toBe('evolucao-argolas');
    expect(firebaseConfig.authDomain).toBe('evolucao-argolas.firebaseapp.com');
  });

  it('4. Permissões de perfil (RBAC) isolam a gestão financeira de produção e logística', () => {
    expect(canAccessModule('producao', 'lucro')).toBe(false);
    expect(canAccessModule('logistica', 'lucro')).toBe(false);
    expect(canAccessModule('gestao', 'lucro')).toBe(true);
    expect(canAccessModule('producao', 'producao')).toBe(true);
    expect(canAccessModule('logistica', 'vendas')).toBe(true);
  });

  it('5. Telas iniciais por perfil exibem as ações diretas sem sobrecarregar o usuário', () => {
    const acoesProducao = getHomeActionsForProfile('producao');
    const acoesLogistica = getHomeActionsForProfile('logistica');
    const acoesGestao = getHomeActionsForProfile('gestao');

    expect(acoesProducao.length).toBe(3);
    expect(acoesLogistica.length).toBe(2);
    expect(acoesGestao.length).toBe(3);
  });
});
