import { SaidaProducao, PedidoVenda, ItemPedidoVenda, CATALOGO_ARGOLAS } from "@/types/domain";

export interface ItemPedidoVendaInput {
  modeloId: string;
  saidaId: string;
  tipoUnidade: "unidades" | "kg";
  quantidade: number;
  precoCentavos: number;
}

/**
 * Converte peso em quilogramas (kg) para o número aproximado de argolas
 * utilizando a taxa de unidades por kg cadastrada no catálogo.
 */
export function converterKgParaUnidades(modeloId: string, pesoKg: number): number {
  if (typeof pesoKg !== "number" || isNaN(pesoKg) || pesoKg <= 0) {
    throw new Error("Peso em kg deve ser maior que zero");
  }

  const modelo = CATALOGO_ARGOLAS.find((m) => m.id === modeloId);
  const taxa = modelo ? modelo.unidadesPorKgAprox : 1000;

  return Math.round(pesoKg * taxa);
}

/**
 * Calcula o saldo disponível de uma saída física da produção recebida na logística.
 * Fórmula: quantidadeDaSaida - soma(unidadesVendidasEmPedidosAtivosNaoCancelados)
 */
export function calcularSaldoSaida(
  saida: SaidaProducao,
  pedidos: PedidoVenda[]
): number {
  if (!saida.ativo) {
    return 0;
  }

  // Se a carga foi levada para banhar e ainda está em banho, não fica disponível para venda
  if (saida.destino === "banho" && saida.statusBanho === "em_banho") {
    return 0;
  }

  let totalVendido = 0;

  for (const pedido of pedidos) {
    if (!pedido.ativo || pedido.situacao === "cancelada") continue;

    for (const item of pedido.itens) {
      if (item.saidaId === saida.id) {
        totalVendido += item.quantidadeUnidades;
      }
    }
  }

  return Math.max(0, saida.quantidade - totalVendido);
}

/**
 * Calcula o total e o agrupamento por modelo de argolas atualmente em processo de banho.
 */
export function calcularEstoqueBanho(saidas: SaidaProducao[]): {
  total: number;
  porModelo: Record<string, number>;
} {
  const porModelo: Record<string, number> = {};
  for (const modelo of CATALOGO_ARGOLAS) {
    porModelo[modelo.id] = 0;
  }

  let total = 0;
  for (const saida of saidas) {
    if (saida.ativo && saida.destino === "banho" && saida.statusBanho === "em_banho") {
      porModelo[saida.modeloId] = (porModelo[saida.modeloId] || 0) + saida.quantidade;
      total += saida.quantidade;
    }
  }

  return { total, porModelo };
}

/**
 * Validação de item individual a ser adicionado ao pedido de venda.
 */
export function validarItemPedido(
  item: ItemPedidoVendaInput,
  saldoDisponivelNaSaida: number
): { valido: boolean; erro?: string; unidadesCalculadas: number } {
  if (!item.modeloId) {
    return { valido: false, erro: "Selecione o modelo da argola", unidadesCalculadas: 0 };
  }

  if (!item.saidaId) {
    return { valido: false, erro: "Selecione a remessa de origem da van", unidadesCalculadas: 0 };
  }

  if (typeof item.precoCentavos !== "number" || item.precoCentavos <= 0) {
    return { valido: false, erro: "Preço do item deve ser maior que zero", unidadesCalculadas: 0 };
  }

  let unidadesCalculadas = 0;

  if (item.tipoUnidade === "unidades") {
    if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
      return {
        valido: false,
        erro: "Quantidade de argolas deve ser um número inteiro maior que zero",
        unidadesCalculadas: 0,
      };
    }

    if (item.quantidade < 100) {
      return {
        valido: false,
        erro: "Pedido mínimo para venda fracionada é de 100 unidades",
        unidadesCalculadas: 0,
      };
    }

    unidadesCalculadas = item.quantidade;
  } else if (item.tipoUnidade === "kg") {
    if (typeof item.quantidade !== "number" || item.quantidade <= 0) {
      return {
        valido: false,
        erro: "Quantidade em kg deve ser maior que zero",
        unidadesCalculadas: 0,
      };
    }

    try {
      unidadesCalculadas = converterKgParaUnidades(item.modeloId, item.quantidade);
    } catch (err: any) {
      return { valido: false, erro: err.message, unidadesCalculadas: 0 };
    }
  } else {
    return { valido: false, erro: "Tipo de unidade inválido", unidadesCalculadas: 0 };
  }

  if (unidadesCalculadas > saldoDisponivelNaSaida) {
    return {
      valido: false,
      erro: "Quantidade informada é maior do que o saldo disponível nesta remessa da van",
      unidadesCalculadas,
    };
  }

  return { valido: true, unidadesCalculadas };
}

/**
 * Totalização monetária e quantitativa do pedido de venda usando estritamente centavos inteiros.
 */
export function calcularTotaisPedido(
  itens: Array<{ quantidadeUnidades: number; precoCentavos: number }>,
  freteCentavos: number = 0
): {
  totalItensCentavos: number;
  totalGeralCentavos: number;
  totalUnidades: number;
} {
  const totalItensCentavos = itens.reduce((acc, item) => acc + item.precoCentavos, 0);
  const totalUnidades = itens.reduce((acc, item) => acc + item.quantidadeUnidades, 0);
  const freteValido = Math.max(0, Math.round(freteCentavos));
  const totalGeralCentavos = totalItensCentavos + freteValido;

  return {
    totalItensCentavos,
    totalGeralCentavos,
    totalUnidades,
  };
}

/**
 * Validação completa do pedido antes da persistência.
 */
export function validarPedidoCompleto(
  pedido: {
    clienteId: string;
    itens: Array<{
      modeloId: string;
      saidaId: string;
      quantidadeUnidades: number;
      precoCentavos: number;
    }>;
    tipoEnvio: string;
    freteCentavos: number;
  },
  saldoPorSaida: Record<string, number>
): { valido: boolean; erro?: string } {
  if (!pedido.clienteId || pedido.clienteId.trim() === "") {
    return { valido: false, erro: "Selecione um cliente para a venda" };
  }

  if (!pedido.itens || pedido.itens.length === 0) {
    return { valido: false, erro: "O pedido deve conter pelo menos um item" };
  }

  // Verifica consumo consolidado por saidaId
  const consumoPorSaida: Record<string, number> = {};
  for (const item of pedido.itens) {
    consumoPorSaida[item.saidaId] = (consumoPorSaida[item.saidaId] || 0) + item.quantidadeUnidades;
  }

  for (const saidaId in consumoPorSaida) {
    const consumo = consumoPorSaida[saidaId];
    const saldo = saldoPorSaida[saidaId] ?? 0;
    if (consumo > saldo) {
      return {
        valido: false,
        erro: `O total de argolas do pedido (${consumo.toLocaleString("pt-BR")}) ultrapassa o saldo disponível nesta remessa (${saldo.toLocaleString("pt-BR")})`,
      };
    }
  }

  return { valido: true };
}
