import { CATALOGO_MODELOS, PedidoVenda } from '@/types/domain';

export type PeriodoFiltro = 'hoje' | 'semana' | 'mes' | 'todos';

export interface DesempenhoModelo {
  modeloId: string;
  nomeModelo: string;
  quantidadeVendida: number;
  receitaCentavos: number;
  custoMateriaPrimaCentavos: number;
  lucroCentavos: number;
  margemPercentual: number;
}

export interface MetricasLucro {
  receitaBrutaCentavos: number;
  custoTotalCentavos: number;
  custoMateriaPrimaCentavos: number;
  custoFreteCentavos: number;
  custoEmbalagemCentavos: number;
  custoCombustivelCentavos: number;
  lucroLiquidoCentavos: number;
  margemPercentual: number;
  lucroNegativo: boolean;
  totalUnidadesVendidas: number;
  totalPedidos: number;
  desempenhoPorModelo: DesempenhoModelo[];
}

/**
 * Filtra uma lista de pedidos pelo período desejado.
 */
export function filtrarPorPeriodo(
  pedidos: PedidoVenda[],
  periodo: PeriodoFiltro
): PedidoVenda[] {
  if (periodo === 'todos') {
    return pedidos;
  }

  const agora = new Date();

  return pedidos.filter((pedido) => {
    const dataPedido =
      pedido.data instanceof Date ? pedido.data : new Date(pedido.data);

    if (periodo === 'hoje') {
      return (
        dataPedido.getFullYear() === agora.getFullYear() &&
        dataPedido.getMonth() === agora.getMonth() &&
        dataPedido.getDate() === agora.getDate()
      );
    }

    if (periodo === 'semana') {
      const umaSemanaAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
      return dataPedido >= umaSemanaAtras;
    }

    if (periodo === 'mes') {
      return (
        dataPedido.getFullYear() === agora.getFullYear() &&
        dataPedido.getMonth() === agora.getMonth()
      );
    }

    return true;
  });
}

/**
 * Calcula todas as métricas consolidadas de receita, custos e lucro a partir dos pedidos informados.
 * Aplica matemática financeira estrita em centavos inteiros para evitar imprecisões de ponto flutuante.
 */
export function calcularMetricasLucro(pedidos: PedidoVenda[]): MetricasLucro {
  let receitaBrutaCentavos = 0;
  let custoMateriaPrimaCentavos = 0;
  let custoFreteCentavos = 0;
  let custoEmbalagemCentavos = 0;
  let custoCombustivelCentavos = 0;
  let totalUnidadesVendidas = 0;

  // Mapa para agregação por modelo
  const mapaModelos = new Map<
    string,
    {
      quantidadeVendida: number;
      receitaCentavos: number;
      custoMateriaPrimaCentavos: number;
    }
  >();

  // Inicializa com todos os 7 modelos do catálogo oficial
  for (const modelo of CATALOGO_MODELOS) {
    mapaModelos.set(modelo.id, {
      quantidadeVendida: 0,
      receitaCentavos: 0,
      custoMateriaPrimaCentavos: 0,
    });
  }

  for (const pedido of pedidos) {
    receitaBrutaCentavos += pedido.totalPedidoCentavos || 0;
    custoFreteCentavos += pedido.custoFreteCentavos || 0;
    custoEmbalagemCentavos += pedido.custoEmbalagemCentavos || 0;
    custoCombustivelCentavos += pedido.custoCombustivelCentavos || 0;
    totalUnidadesVendidas += pedido.totalUnidades || 0;

    if (pedido.itens && Array.isArray(pedido.itens)) {
      for (const item of pedido.itens) {
        const itemMp = item.custoMateriaPrimaCentavos || 0;
        custoMateriaPrimaCentavos += itemMp;

        const modStats = mapaModelos.get(item.modeloId) || {
          quantidadeVendida: 0,
          receitaCentavos: 0,
          custoMateriaPrimaCentavos: 0,
        };

        modStats.quantidadeVendida += item.quantidadeUnidades || 0;
        modStats.receitaCentavos += item.precoCentavos || 0;
        modStats.custoMateriaPrimaCentavos += itemMp;

        mapaModelos.set(item.modeloId, modStats);
      }
    }
  }

  const custoTotalCentavos =
    custoMateriaPrimaCentavos +
    custoFreteCentavos +
    custoEmbalagemCentavos +
    custoCombustivelCentavos;

  const lucroLiquidoCentavos = receitaBrutaCentavos - custoTotalCentavos;
  const margemPercentual =
    receitaBrutaCentavos > 0
      ? (lucroLiquidoCentavos / receitaBrutaCentavos) * 100
      : 0;
  const lucroNegativo = lucroLiquidoCentavos < 0;

  // Monta lista de desempenho por modelo
  const desempenhoPorModelo: DesempenhoModelo[] = CATALOGO_MODELOS.map(
    (modelo) => {
      const stats = mapaModelos.get(modelo.id) || {
        quantidadeVendida: 0,
        receitaCentavos: 0,
        custoMateriaPrimaCentavos: 0,
      };

      const lucroCentavos = stats.receitaCentavos - stats.custoMateriaPrimaCentavos;
      const margem =
        stats.receitaCentavos > 0
          ? (lucroCentavos / stats.receitaCentavos) * 100
          : 0;

      return {
        modeloId: modelo.id,
        nomeModelo: modelo.nome,
        quantidadeVendida: stats.quantidadeVendida,
        receitaCentavos: stats.receitaCentavos,
        custoMateriaPrimaCentavos: stats.custoMateriaPrimaCentavos,
        lucroCentavos,
        margemPercentual: margem,
      };
    }
  );

  return {
    receitaBrutaCentavos,
    custoTotalCentavos,
    custoMateriaPrimaCentavos,
    custoFreteCentavos,
    custoEmbalagemCentavos,
    custoCombustivelCentavos,
    lucroLiquidoCentavos,
    margemPercentual,
    lucroNegativo,
    totalUnidadesVendidas,
    totalPedidos: pedidos.length,
    desempenhoPorModelo,
  };
}
