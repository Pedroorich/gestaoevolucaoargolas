/**
 * Módulo Financeiro — Gestão Evolução Argolas
 * Regra Obrigatória nº 2: Valores monetários são guardados em centavos, como inteiros.
 * Nunca use ponto flutuante para dinheiro.
 */

/**
 * Converte um valor em reais (ex: 10.50) para centavos inteiros (ex: 1050).
 * Usa Math.round para evitar imprecisão clássica de ponto flutuante (ex: 0.1 + 0.2).
 */
export function toCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Converte um valor em centavos inteiros (ex: 1050) para reais (ex: 10.50).
 */
export function toReais(cents: number): number {
  return cents / 100;
}

/**
 * Formata um valor em centavos inteiros para exibição em Real Brasileiro (R$).
 * Exemplo: 1050 -> "R$ 10,50"
 */
export function formatBRL(cents: number): string {
  const reais = toReais(cents);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

export const formatCentsToBRL = formatBRL;

/**
 * Calcula o custo unitário de uma argola absorvendo as perdas do lote.
 * Custo Unitário = Custo Total do Arame do Lote / Quantidade Boa Produzida
 * Retorna o valor em centavos inteiros arredondados.
 */
export function calculateUnitCost(totalMaterialCents: number, goodUnits: number): number {
  if (goodUnits <= 0) return 0;
  return Math.round(totalMaterialCents / goodUnits);
}

/**
 * Converte string digitada pelo usuário (ex: "450,50", "450.50", "450") para centavos inteiros.
 */
export function parseBRLInputToCents(input: string): number {
  let sanitized = input.trim();
  if (sanitized.includes(',') && sanitized.includes('.')) {
    sanitized = sanitized.replace(/\./g, '').replace(',', '.');
  } else if (sanitized.includes(',')) {
    sanitized = sanitized.replace(',', '.');
  }
  const num = parseFloat(sanitized);
  if (isNaN(num) || num < 0) {
    throw new Error('Valor monetário inválido');
  }
  return toCents(num);
}
