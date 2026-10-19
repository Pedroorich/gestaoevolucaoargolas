import { describe, it, expect } from "vitest";
import {
  calcularSaldoSaida,
  converterKgParaUnidades,
  validarItemPedido,
  calcularTotaisPedido,
  validarPedidoCompleto,
  calcularEstoqueBanho,
} from "@/lib/vendas/vendas-engine";
import { SaidaProducao, PedidoVenda } from "@/types/domain";

describe("Engine de Vendas e Logística", () => {
  const saidaExemplo: SaidaProducao = {
    id: "saida-1",
    loteId: "lote-1",
    modeloId: "argola-19mm",
    quantidade: 4000,
    transporte: "van_propria",
    data: new Date("2026-10-16T09:00:00Z"),
    responsavelId: "user-1",
    ativo: true,
  };

  const pedidosExemplo: PedidoVenda[] = [
    {
      id: "pedido-1",
      numeroPedido: 101,
      clienteId: "cli-1",
      clienteNome: "Chaveiro Central",
      data: new Date("2026-10-16T10:00:00Z"),
      tipoEnvio: "van_propria",
      custoFreteCentavos: 0,
      custoEmbalagemCentavos: 0,
      itens: [
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 1500,
          quantidadeUnidades: 1500,
          precoCentavos: 25000,
        },
      ],
      totalItensCentavos: 25000,
      totalPedidoCentavos: 25000,
      totalUnidades: 1500,
      situacao: "entregue",
      responsavelId: "user-2",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
    {
      id: "pedido-2",
      numeroPedido: 102,
      clienteId: "cli-2",
      clienteNome: "Bazar do Zé",
      data: new Date("2026-10-16T11:00:00Z"),
      tipoEnvio: "lalamove",
      custoFreteCentavos: 2500,
      custoEmbalagemCentavos: 0,
      itens: [
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 500,
          quantidadeUnidades: 500,
          precoCentavos: 9000,
        },
      ],
      totalItensCentavos: 9000,
      totalPedidoCentavos: 11500,
      totalUnidades: 500,
      situacao: "pendente",
      responsavelId: "user-2",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
    {
      id: "pedido-cancelado",
      numeroPedido: 103,
      clienteId: "cli-3",
      clienteNome: "Cancelado",
      data: new Date(),
      tipoEnvio: "van_propria",
      custoFreteCentavos: 0,
      custoEmbalagemCentavos: 0,
      itens: [
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 800,
          quantidadeUnidades: 800,
          precoCentavos: 15000,
        },
      ],
      totalItensCentavos: 15000,
      totalPedidoCentavos: 15000,
      totalUnidades: 800,
      situacao: "cancelada",
      responsavelId: "user-2",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  ];

  describe("converterKgParaUnidades", () => {
    it("deve converter peso em kg para unidades usando a taxa do catálogo", () => {
      // Argola 19mm: 950 unidades por kg
      expect(converterKgParaUnidades("argola-19mm", 1)).toBe(950);
      expect(converterKgParaUnidades("argola-19mm", 2.5)).toBe(2375);
      // Argola 22mm: 650 unidades por kg
      expect(converterKgParaUnidades("argola-22mm", 3)).toBe(1950);
    });

    it("deve rejeitar peso menor ou igual a zero", () => {
      expect(() => converterKgParaUnidades("argola-19mm", 0)).toThrow();
      expect(() => converterKgParaUnidades("argola-19mm", -1)).toThrow();
    });
  });

  describe("calcularSaldoSaida", () => {
    it("deve abater pedidos entregues e pendentes, mas ignorar cancelados ou inativos", () => {
      // 4000 na saída - 1500 (pedido 1 entregue) - 500 (pedido 2 pendente) = 2000
      // O pedido cancelado (800) não consome estoque.
      const saldo = calcularSaldoSaida(saidaExemplo, pedidosExemplo);
      expect(saldo).toBe(2000);
    });

    it("deve retornar 0 se a saída estiver desativada (exclusão lógica)", () => {
      const saidaInativa: SaidaProducao = { ...saidaExemplo, ativo: false };
      const saldo = calcularSaldoSaida(saidaInativa, pedidosExemplo);
      expect(saldo).toBe(0);
    });

    it("deve retornar saldo 0 para saídas com destino banho cujo status seja em_banho", () => {
      const saidaEmBanho: SaidaProducao = {
        ...saidaExemplo,
        id: "saida-banho-1",
        destino: "banho",
        statusBanho: "em_banho",
      };
      const saldo = calcularSaldoSaida(saidaEmBanho, []);
      expect(saldo).toBe(0);
    });

    it("deve liberar saldo para vendas quando a saída do banho for marcada como concluido", () => {
      const saidaBanhoConcluido: SaidaProducao = {
        ...saidaExemplo,
        id: "saida-banho-2",
        destino: "banho",
        statusBanho: "concluido",
      };
      const saldo = calcularSaldoSaida(saidaBanhoConcluido, []);
      expect(saldo).toBe(4000);
    });
  });

  describe("calcularEstoqueBanho", () => {
    it("deve somar apenas saídas ativas em processo de banho", () => {
      const saidas: SaidaProducao[] = [
        {
          id: "s1",
          loteId: "l1",
          modeloId: "argola-19mm",
          quantidade: 3000,
          transporte: "van_propria",
          destino: "banho",
          statusBanho: "em_banho",
          data: new Date(),
          responsavelId: "u1",
          ativo: true,
        },
        {
          id: "s2",
          loteId: "l2",
          modeloId: "argola-19mm",
          quantidade: 2000,
          transporte: "van_propria",
          destino: "banho",
          statusBanho: "concluido", // Já concluído, não deve contar como em banho
          data: new Date(),
          responsavelId: "u1",
          ativo: true,
        },
        {
          id: "s3",
          loteId: "l3",
          modeloId: "argola-22mm",
          quantidade: 1500,
          transporte: "van_propria",
          destino: "banho",
          statusBanho: "em_banho",
          data: new Date(),
          responsavelId: "u1",
          ativo: true,
        },
        {
          id: "s4",
          loteId: "l4",
          modeloId: "argola-16mm",
          quantidade: 500,
          transporte: "van_propria",
          destino: "centro_logistica", // Destino direto, não é banho
          data: new Date(),
          responsavelId: "u1",
          ativo: true,
        },
      ];

      const resultado = calcularEstoqueBanho(saidas);
      expect(resultado.total).toBe(4500); // 3000 (19mm) + 1500 (22mm)
      expect(resultado.porModelo["argola-19mm"]).toBe(3000);
      expect(resultado.porModelo["argola-22mm"]).toBe(1500);
      expect(resultado.porModelo["argola-16mm"]).toBe(0);
    });
  });

  describe("validarItemPedido", () => {
    it("deve aprovar item por unidade com quantidade válida e saldo suficiente", () => {
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 500,
          precoCentavos: 9000,
        },
        2000 // saldo disponível
      );

      expect(res.valido).toBe(true);
      expect(res.unidadesCalculadas).toBe(500);
      expect(res.erro).toBeUndefined();
    });

    it("deve rejeitar venda em unidades menor que 100 unidades (pedido mínimo)", () => {
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 99,
          precoCentavos: 2000,
        },
        2000
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe("Pedido mínimo para venda fracionada é de 100 unidades");
    });

    it("deve rejeitar venda em unidades que supere o saldo disponível na saída", () => {
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 2500,
          precoCentavos: 40000,
        },
        2000 // só há 2000
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe(
        "Quantidade informada é maior do que o saldo disponível nesta remessa da van"
      );
    });

    it("deve converter venda por kg e validar saldo correspondente em unidades", () => {
      // 2 kg de 19mm = 1900 unidades
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "kg",
          quantidade: 2,
          precoCentavos: 35000,
        },
        2000
      );

      expect(res.valido).toBe(true);
      expect(res.unidadesCalculadas).toBe(1900);
    });

    it("deve rejeitar venda por kg se as unidades calculadas superarem o saldo", () => {
      // 3 kg de 19mm = 2850 unidades (saldo é 2000)
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "kg",
          quantidade: 3,
          precoCentavos: 50000,
        },
        2000
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe(
        "Quantidade informada é maior do que o saldo disponível nesta remessa da van"
      );
    });

    it("deve rejeitar preço do item menor ou igual a zero", () => {
      const res = validarItemPedido(
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 200,
          precoCentavos: 0,
        },
        2000
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe("Preço do item deve ser maior que zero");
    });
  });

  describe("calcularTotaisPedido", () => {
    it("deve totalizar itens e frete com aritmética inteira de centavos", () => {
      const itens = [
        { quantidadeUnidades: 1900, precoCentavos: 35000 }, // R$ 350,00
        { quantidadeUnidades: 500, precoCentavos: 9000 },   // R$ 90,00
      ];
      const frete = 2500; // R$ 25,00 Lalamove

      const totais = calcularTotaisPedido(itens, frete);
      expect(totais.totalItensCentavos).toBe(44000); // R$ 440,00
      expect(totais.totalGeralCentavos).toBe(46500); // R$ 465,00
      expect(totais.totalUnidades).toBe(2400);
    });
  });

  describe("validarPedidoCompleto", () => {
    it("deve rejeitar pedido sem cliente selecionado", () => {
      const res = validarPedidoCompleto(
        {
          clienteId: "",
          itens: [
            {
              modeloId: "argola-19mm",
              saidaId: "saida-1",
              quantidadeUnidades: 500,
              precoCentavos: 9000,
            },
          ],
          tipoEnvio: "van_propria",
          freteCentavos: 0,
        },
        { "saida-1": 2000 }
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe("Selecione um cliente para a venda");
    });

    it("deve rejeitar pedido sem itens", () => {
      const res = validarPedidoCompleto(
        {
          clienteId: "cli-1",
          itens: [],
          tipoEnvio: "van_propria",
          freteCentavos: 0,
        },
        {}
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toBe("O pedido deve conter pelo menos um item");
    });

    it("deve rejeitar quando a soma de múltiplos itens para a mesma saída excede o saldo", () => {
      const res = validarPedidoCompleto(
        {
          clienteId: "cli-1",
          itens: [
            {
              modeloId: "argola-19mm",
              saidaId: "saida-1",
              quantidadeUnidades: 1200,
              precoCentavos: 20000,
            },
            {
              modeloId: "argola-19mm",
              saidaId: "saida-1",
              quantidadeUnidades: 1000,
              precoCentavos: 18000,
            },
          ],
          tipoEnvio: "van_propria",
          freteCentavos: 0,
        },
        { "saida-1": 2000 } // total pedido é 2200, saldo é 2000
      );

      expect(res.valido).toBe(false);
      expect(res.erro).toContain("ultrapassa o saldo disponível nesta remessa");
    });
  });
});
