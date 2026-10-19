import { describe, it, expect } from 'vitest';
import { toCents, toReais, formatBRL, calculateUnitCost, parseBRLInputToCents } from '@/lib/money';

describe('Módulo Financeiro (Centavos)', () => {
  it('converte valor em reais para centavos inteiros com precisão', () => {
    expect(toCents(10.50)).toBe(1050);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('converte centavos para reais', () => {
    expect(toReais(1050)).toBe(10.50);
  });

  it('formata centavos para Real brasileiro (R$)', () => {
    // Normaliza espaços sem quebra (\u00a0)
    const formatted = formatBRL(1050).replace(/\u00a0/g, ' ');
    expect(formatted).toBe('R$ 10,50');
    expect(formatBRL(0).replace(/\u00a0/g, ' ')).toBe('R$ 0,00');
  });

  it('calcula custo unitário absorvendo perdas em centavos inteiros', () => {
    // R$ 100,00 gastos para produzir 1000 argolas boas
    expect(calculateUnitCost(10000, 1000)).toBe(10);
    // Divisão com arredondamento seguro
    expect(calculateUnitCost(1000, 3)).toBe(333); // 333 centavos (R$ 3,33)
  });

  it('retorna 0 quando quantidade produzida for menor ou igual a zero', () => {
    expect(calculateUnitCost(10000, 0)).toBe(0);
    expect(calculateUnitCost(10000, -5)).toBe(0);
  });

  it('converte string de entrada do usuário para centavos inteiros', () => {
    expect(parseBRLInputToCents("450,50")).toBe(45050);
    expect(parseBRLInputToCents("450.50")).toBe(45050);
    expect(parseBRLInputToCents("1.250,00")).toBe(125000);
    expect(parseBRLInputToCents("100")).toBe(10000);
    expect(() => parseBRLInputToCents("-50")).toThrow();
  });
});
