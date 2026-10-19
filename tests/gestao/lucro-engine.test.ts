import { describe, it, expect } from 'vitest';
import {
  calcularMetricasLucro,
  filtrarPorPeriodo,
  PeriodoFiltro,
} from '@/lib/gestao/lucro-engine';
import { PedidoVenda } from '@/types/domain';

describe('Engine de Métricas e Painel de Lucro', () => {
  const pedidosExemplo: PedidoVenda[] = [
    {
      id: 'ped-1',
      numeroPedido: 101,
      clienteId: 'cli-1',
      clienteNome: 'Chaveiro Silva',
      data: new Date(), // Hoje
      tipoEnvio: 'van_propria',
      custoFreteCentavos: 0,
      custoEmbalagemCentavos: 1000, // R$ 10,00
      custoCombustivelCentavos: 2000, // R$ 20,00
      itens: [
        {
          modeloId: 'argola-22mm',
          saidaId: 'saida-1',
          tipoUnidade: 'unidades',
          quantidade: 1000,
          quantidadeUnidades: 1000,
          precoCentavos: 15000, // R$ 150,00
          custoMateriaPrimaCentavos: 5000, // R$ 50,00
        },
      ],
      totalItensCentavos: 15000,
      totalPedidoCentavos: 15000,
      totalUnidades: 1000,
      situacao: 'entregue',
      responsavelId: 'user-1',
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
    {
      id: 'ped-2',
      numeroPedido: 102,
      clienteId: 'cli-2',
      clienteNome: 'Bazar Central',
      data: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Há 3 dias
      tipoEnvio: 'lalamove',
      custoFreteCentavos: 3500, // R$ 35,00
      custoEmbalagemCentavos: 500, // R$ 5,00
      custoCombustivelCentavos: 0,
      itens: [
        {
          modeloId: 'argola-16mm',
          saidaId: 'saida-2',
          tipoUnidade: 'unidades',
          quantidade: 2000,
          quantidadeUnidades: 2000,
          precoCentavos: 20000, // R$ 200,00
          custoMateriaPrimaCentavos: 7000, // R$ 70,00
        },
      ],
      totalItensCentavos: 20000,
      totalPedidoCentavos: 23500, // Inclui frete
      totalUnidades: 2000,
      situacao: 'entregue',
      responsavelId: 'user-1',
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  ];

  it('deve retornar métricas zeradas sem divisão por zero para lista vazia', () => {
    const metricas = calcularMetricasLucro([]);
    expect(metricas.receitaBrutaCentavos).toBe(0);
    expect(metricas.custoTotalCentavos).toBe(0);
    expect(metricas.lucroLiquidoCentavos).toBe(0);
    expect(metricas.margemPercentual).toBe(0);
    expect(metricas.lucroNegativo).toBe(false);
    expect(metricas.totalUnidadesVendidas).toBe(0);
    expect(metricas.desempenhoPorModelo).toHaveLength(7);
  });

  it('deve calcular corretamente receita, custos e lucro líquido em centavos', () => {
    const metricas = calcularMetricasLucro(pedidosExemplo);

    // Receita: 15000 + 23500 = 38500 (R$ 385,00)
    expect(metricas.receitaBrutaCentavos).toBe(38500);

    // Custos:
    // MP: 5000 + 7000 = 12000
    // Frete: 0 + 3500 = 3500
    // Embalagem: 1000 + 500 = 1500
    // Combustível: 2000 + 0 = 2000
    // Total Custos: 12000 + 3500 + 1500 + 2000 = 19000 (R$ 190,00)
    expect(metricas.custoMateriaPrimaCentavos).toBe(12000);
    expect(metricas.custoFreteCentavos).toBe(3500);
    expect(metricas.custoEmbalagemCentavos).toBe(1500);
    expect(metricas.custoCombustivelCentavos).toBe(2000);
    expect(metricas.custoTotalCentavos).toBe(19000);

    // Lucro Líquido: 38500 - 19000 = 19500 (R$ 195,00)
    expect(metricas.lucroLiquidoCentavos).toBe(19500);

    // Margem: (19500 / 38500) * 100 = 50.65%
    expect(metricas.margemPercentual).toBeCloseTo(50.65, 1);
    expect(metricas.lucroNegativo).toBe(false);
    expect(metricas.totalUnidadesVendidas).toBe(3000);
  });

  it('deve sinalizar lucroNegativo quando custos superam a receita', () => {
    const pedidoPrejuizo: PedidoVenda = {
      ...pedidosExemplo[0],
      totalPedidoCentavos: 5000, // Cobrou R$ 50
      custoFreteCentavos: 10000, // Frete caro R$ 100
      custoEmbalagemCentavos: 1000,
      custoCombustivelCentavos: 0,
      itens: [
        {
          modeloId: 'argola-22mm',
          saidaId: 'saida-1',
          tipoUnidade: 'unidades',
          quantidade: 500,
          quantidadeUnidades: 500,
          precoCentavos: 5000,
          custoMateriaPrimaCentavos: 4000,
        },
      ],
    };

    const metricas = calcularMetricasLucro([pedidoPrejuizo]);
    // Receita: 5000
    // Custo: 4000 + 10000 + 1000 = 15000
    // Lucro: -10000
    expect(metricas.lucroLiquidoCentavos).toBe(-10000);
    expect(metricas.lucroNegativo).toBe(true);
  });

  it('deve filtrar pedidos corretamente por período (hoje, semana, mes, todos)', () => {
    const hoje = filtrarPorPeriodo(pedidosExemplo, 'hoje');
    expect(hoje).toHaveLength(1);
    expect(hoje[0].id).toBe('ped-1');

    const semana = filtrarPorPeriodo(pedidosExemplo, 'semana');
    expect(semana).toHaveLength(2);

    const todos = filtrarPorPeriodo(pedidosExemplo, 'todos');
    expect(todos).toHaveLength(2);
  });

  it('deve calcular o detalhamento de desempenho individual para cada modelo de argola', () => {
    const metricas = calcularMetricasLucro(pedidosExemplo);
    const mod22 = metricas.desempenhoPorModelo.find((m) => m.modeloId === 'argola-22mm');
    expect(mod22).toBeDefined();
    expect(mod22?.quantidadeVendida).toBe(1000);
    expect(mod22?.receitaCentavos).toBe(15000);
    expect(mod22?.custoMateriaPrimaCentavos).toBe(5000);

    const mod16 = metricas.desempenhoPorModelo.find((m) => m.modeloId === 'argola-16mm');
    expect(mod16).toBeDefined();
    expect(mod16?.quantidadeVendida).toBe(2000);

    const mod25 = metricas.desempenhoPorModelo.find((m) => m.modeloId === 'argola-25mm');
    expect(mod25).toBeDefined();
    expect(mod25?.quantidadeVendida).toBe(0);
    expect(mod25?.receitaCentavos).toBe(0);
  });
});
