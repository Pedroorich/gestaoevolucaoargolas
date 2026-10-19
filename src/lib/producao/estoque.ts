import { LoteProducao, SaidaProducao, CATALOGO_ARGOLAS } from "@/types/domain";

export interface EstoqueModeloResumo {
  produzido: number;
  perdas: number;
  enviado: number;
  disponivel: number;
}

/**
 * Calcula o saldo disponível de um lote específico.
 * Fórmula: quantidadeProduzida - perdas - totalSaidasAtivas
 * Se o lote estiver inativo (exclusão lógica), o saldo é 0.
 */
export function calcularSaldoLote(
  lote: LoteProducao,
  saidasDoLote: SaidaProducao[]
): number {
  if (!lote.ativo) {
    return 0;
  }

  const totalSaidasAtivas = saidasDoLote
    .filter((s) => s.ativo && s.loteId === lote.id)
    .reduce((acc, s) => acc + s.quantidade, 0);

  const saldo = lote.quantidadeProduzida - lote.perdas - totalSaidasAtivas;
  return Math.max(0, saldo);
}

/**
 * Agrega o estoque consolidado por modelo de argola para os 7 modelos do catálogo.
 */
export function calcularEstoquePorModelo(
  lotes: LoteProducao[],
  saidas: SaidaProducao[]
): Record<string, EstoqueModeloResumo> {
  const resumo: Record<string, EstoqueModeloResumo> = {};

  // Inicializa todos os modelos do catálogo zerados
  for (const modelo of CATALOGO_ARGOLAS) {
    resumo[modelo.id] = {
      produzido: 0,
      perdas: 0,
      enviado: 0,
      disponivel: 0,
    };
  }

  // Agrega lotes ativos
  for (const lote of lotes) {
    if (!lote.ativo) continue;

    if (!resumo[lote.modeloId]) {
      resumo[lote.modeloId] = { produzido: 0, perdas: 0, enviado: 0, disponivel: 0 };
    }

    resumo[lote.modeloId].produzido += lote.quantidadeProduzida;
    resumo[lote.modeloId].perdas += lote.perdas;
  }

  const lotesAtivosIds = new Set(lotes.filter((l) => l.ativo).map((l) => l.id));

  // Agrega saídas ativas cujos lotes de origem ainda estejam ativos
  for (const saida of saidas) {
    if (!saida.ativo || !lotesAtivosIds.has(saida.loteId)) continue;

    if (!resumo[saida.modeloId]) {
      resumo[saida.modeloId] = { produzido: 0, perdas: 0, enviado: 0, disponivel: 0 };
    }

    resumo[saida.modeloId].enviado += saida.quantidade;
  }

  // Calcula disponível para cada modelo
  for (const modeloId in resumo) {
    const item = resumo[modeloId];
    item.disponivel = Math.max(0, item.produzido - item.perdas - item.enviado);
  }

  return resumo;
}

/**
 * Calcula o saldo consolidado total da fábrica inteira.
 */
export function calcularEstoqueTotal(
  lotes: LoteProducao[],
  saidas: SaidaProducao[]
): EstoqueModeloResumo {
  const porModelo = calcularEstoquePorModelo(lotes, saidas);

  return Object.values(porModelo).reduce(
    (acc, m) => ({
      produzido: acc.produzido + m.produzido,
      perdas: acc.perdas + m.perdas,
      enviado: acc.enviado + m.enviado,
      disponivel: acc.disponivel + m.disponivel,
    }),
    { produzido: 0, perdas: 0, enviado: 0, disponivel: 0 }
  );
}

/**
 * Validação de dados para cadastro de novo lote.
 * Suporta preenchimento por quantidade em unidades OU peso em quilos (kg).
 * Se nenhum dos dois for informado, a validação rejeita.
 * Se apenas o peso em kg for informado, calcula as unidades baseado na densidade do modelo no catálogo.
 */
export function validarNovoLote(dados: {
  modeloId: string;
  quantidadeProduzida?: number | null;
  pesoKg?: number | null;
  perdas: number;
}): {
  valido: boolean;
  erro?: string;
  quantidadeProduzidaFinal?: number;
  pesoKgFinal?: number | null;
} {
  const modelo = CATALOGO_ARGOLAS.find((m) => m.id === dados.modeloId);
  if (!modelo) {
    return { valido: false, erro: "Modelo de argola não encontrado no catálogo" };
  }

  const temUnidadesPreenchida =
    dados.quantidadeProduzida !== undefined &&
    dados.quantidadeProduzida !== null &&
    !isNaN(dados.quantidadeProduzida);

  const temKgPreenchido =
    dados.pesoKg !== undefined &&
    dados.pesoKg !== null &&
    !isNaN(dados.pesoKg) &&
    dados.pesoKg > 0;

  if (!temUnidadesPreenchida && !temKgPreenchido) {
    return {
      valido: false,
      erro: "Informe a quantidade fabricada (em unidades) ou o peso (em quilos)",
    };
  }

  let quantidadeFinal = 0;
  let pesoKgFinal: number | null = temKgPreenchido ? Number(dados.pesoKg) : null;

  if (temUnidadesPreenchida) {
    if (!Number.isInteger(dados.quantidadeProduzida) || dados.quantidadeProduzida! <= 0) {
      if (!temKgPreenchido) {
        return {
          valido: false,
          erro: "Quantidade produzida deve ser um número inteiro maior que zero",
        };
      }
    } else {
      quantidadeFinal = dados.quantidadeProduzida!;
      if (!temKgPreenchido && modelo.unidadesPorKgAprox > 0) {
        pesoKgFinal = Number((quantidadeFinal / modelo.unidadesPorKgAprox).toFixed(2));
      }
    }
  }

  if (quantidadeFinal <= 0 && temKgPreenchido) {
    quantidadeFinal = Math.round(dados.pesoKg! * modelo.unidadesPorKgAprox);
  }

  if (quantidadeFinal <= 0) {
    return {
      valido: false,
      erro: "Quantidade produzida deve ser um número inteiro maior que zero",
    };
  }

  if (!Number.isInteger(dados.perdas) || dados.perdas < 0) {
    return {
      valido: false,
      erro: "Argolas com defeito (perdas) devem ser um número inteiro não-negativo",
    };
  }

  if (dados.perdas > quantidadeFinal) {
    return {
      valido: false,
      erro: "Perdas não podem ser maiores do que a quantidade produzida",
    };
  }

  return {
    valido: true,
    quantidadeProduzidaFinal: quantidadeFinal,
    pesoKgFinal,
  };
}

/**
 * Validação de dados para registro de saída para van / logística.
 */
export function validarNovaSaida(dados: {
  loteId: string;
  quantidade: number;
  saldoDisponivel: number;
}): { valido: boolean; erro?: string } {
  if (!dados.loteId || dados.loteId.trim() === "") {
    return { valido: false, erro: "Selecione o lote de origem" };
  }

  if (!Number.isInteger(dados.quantidade) || dados.quantidade <= 0) {
    return { valido: false, erro: "Quantidade deve ser um número inteiro maior que zero" };
  }

  if (dados.quantidade > dados.saldoDisponivel) {
    return {
      valido: false,
      erro: "Quantidade informada é maior do que o saldo disponível neste lote",
    };
  }

  return { valido: true };
}
