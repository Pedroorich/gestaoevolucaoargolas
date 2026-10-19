import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CardSaldoRemessas from "@/components/vendas/CardSaldoRemessas";
import { SaidaProducao, PedidoVenda } from "@/types/domain";

describe("Componente CardSaldoRemessas", () => {
  const mockSaidas: SaidaProducao[] = [
    {
      id: "saida-1",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 5000,
      transporte: "propria",
      data: new Date("2026-10-16"),
      responsavelId: "user-1",
      ativo: true,
    },
    {
      id: "saida-2",
      loteId: "lote-2",
      modeloId: "argola-22mm-batida",
      quantidade: 3000,
      transporte: "propria",
      data: new Date("2026-10-16"),
      responsavelId: "user-1",
      ativo: true,
    },
  ];

  const mockPedidos: PedidoVenda[] = [
    {
      id: "ped-1",
      numeroPedido: 1001,
      clienteId: "cli-1",
      clienteNome: "Chaveiro Central",
      data: new Date("2026-10-16"),
      tipoEnvio: "lalamove",
      custoFreteCentavos: 0,
      custoEmbalagemCentavos: 0,
      itens: [
        {
          modeloId: "argola-19mm",
          saidaId: "saida-1",
          tipoUnidade: "unidades",
          quantidade: 1000,
          quantidadeUnidades: 1000,
          precoCentavos: 10000,
        },
      ],
      totalItensCentavos: 10000,
      totalPedidoCentavos: 10000,
      totalUnidades: 1000,
      situacao: "entregue",
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date("2026-10-16"),
      atualizadoEm: new Date("2026-10-16"),
    },
  ];

  it("deve calcular e renderizar o saldo disponível das remessas da van", () => {
    render(<CardSaldoRemessas saidas={mockSaidas} pedidos={mockPedidos} />);

    // Saída 1: 5000 - 1000 = 4000. Saída 2: 3000. Total = 7000.
    expect(screen.getByText(/total disponível nas remessas/i)).toBeDefined();
    expect(screen.getByText(/7\.000/i)).toBeDefined();
    expect(screen.getByText(/4\.000/i)).toBeDefined();
    expect(screen.getByText(/3\.000/i)).toBeDefined();
    expect(screen.getByText(/2 remessas ativas da van/i)).toBeDefined();
  });
});
