import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TabelaPedidosVendas from "@/components/vendas/TabelaPedidosVendas";
import { PedidoVenda } from "@/types/domain";

describe("Componente TabelaPedidosVendas", () => {
  const mockPedidos: PedidoVenda[] = [
    {
      id: "ped-1",
      numeroPedido: 1001,
      clienteId: "cli-1",
      clienteNome: "Chaveiro Central",
      data: new Date("2026-10-16"),
      tipoEnvio: "lalamove",
      custoFreteCentavos: 2500,
      custoEmbalagemCentavos: 500,
      custoCombustivelCentavos: 0,
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
      totalPedidoCentavos: 12500,
      totalUnidades: 1000,
      situacao: "pendente",
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date("2026-10-16"),
      atualizadoEm: new Date("2026-10-16"),
    },
  ];

  const mockOnAtualizarSituacao = vi.fn();
  const mockOnExcluirPedido = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar lista de pedidos com número, cliente e totais em centavos formatados", () => {
    render(
      <TabelaPedidosVendas
        pedidos={mockPedidos}
        onAtualizarSituacao={mockOnAtualizarSituacao}
        onExcluirPedido={mockOnExcluirPedido}
      />
    );

    expect(screen.getByText(/#1001/i)).toBeDefined();
    expect(screen.getByText(/chaveiro central/i)).toBeDefined();
    expect(screen.getByText(/1\.000 un/i)).toBeDefined();
    expect(screen.getByText(/lalamove/i)).toBeDefined();
    expect(screen.getByText(/r\$\s*125,00/i)).toBeDefined();
  });

  it("deve permitir marcar pedido como entregue com um toque", async () => {
    mockOnAtualizarSituacao.mockResolvedValueOnce(undefined);

    render(
      <TabelaPedidosVendas
        pedidos={mockPedidos}
        onAtualizarSituacao={mockOnAtualizarSituacao}
        onExcluirPedido={mockOnExcluirPedido}
      />
    );

    const btnEntregar = screen.getByRole("button", { name: /marcar como entregue/i });
    fireEvent.click(btnEntregar);

    await waitFor(() => {
      expect(mockOnAtualizarSituacao).toHaveBeenCalledWith("ped-1", "entregue");
    });
  });

  it("deve permitir excluir logicamente o pedido mediante confirmação", async () => {
    mockOnExcluirPedido.mockResolvedValueOnce(undefined);

    render(
      <TabelaPedidosVendas
        pedidos={mockPedidos}
        onAtualizarSituacao={mockOnAtualizarSituacao}
        onExcluirPedido={mockOnExcluirPedido}
      />
    );

    const btnExcluir = screen.getByRole("button", { name: /excluir pedido/i });
    fireEvent.click(btnExcluir);

    // Deve abrir confirmação
    expect(screen.getByText(/tem certeza que deseja cancelar\/excluir este pedido\?/i)).toBeDefined();

    const btnConfirmar = screen.getByRole("button", { name: /sim, cancelar pedido/i });
    fireEvent.click(btnConfirmar);

    await waitFor(() => {
      expect(mockOnExcluirPedido).toHaveBeenCalledWith("ped-1");
    });
  });

  it("deve exibir endereço de entrega e link de Rota GPS quando informado no pedido", () => {
    const pedidoComEndereco: PedidoVenda = {
      ...mockPedidos[0],
      enderecoEntrega: "Rua das Flores, 123 - Centro",
    };

    render(
      <TabelaPedidosVendas
        pedidos={[pedidoComEndereco]}
        onAtualizarSituacao={mockOnAtualizarSituacao}
        onExcluirPedido={mockOnExcluirPedido}
      />
    );

    expect(screen.getByText(/Rua das Flores, 123 - Centro/i)).toBeDefined();
    const linkGPS = screen.getByRole("link", { name: /Rota GPS/i });
    expect(linkGPS).toBeDefined();
    expect(linkGPS.getAttribute("href")).toContain(encodeURIComponent("Rua das Flores, 123 - Centro"));
  });
});
