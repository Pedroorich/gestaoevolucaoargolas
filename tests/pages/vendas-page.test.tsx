import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VendasPage from "@/app/vendas/page";
import * as vendasService from "@/lib/firebase/vendas-service";
import * as producaoService from "@/lib/firebase/producao-service";
import { SaidaProducao, PedidoVenda } from "@/types/domain";

// Mock do hook useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-logistica-1",
      nome: "Marcos Logística",
      email: "logistica@evolucaoargolas.com.br",
      perfil: "logistica",
      ativo: true,
      criadoEm: "2026-10-16",
    },
    loading: false,
    perfilAtual: "logistica",
    alternarPerfilTeste: vi.fn(),
  }),
}));

// Mock dos serviços Firestore
vi.mock("@/lib/firebase/vendas-service", () => ({
  listarPedidosVendas: vi.fn(),
  listarClientesParaVenda: vi.fn(),
  criarPedidoVenda: vi.fn(),
  atualizarSituacaoPedido: vi.fn(),
  cadastrarClienteRapido: vi.fn(),
  excluirPedidoLogico: vi.fn(),
}));

vi.mock("@/lib/firebase/producao-service", () => ({
  listarSaidasAtivas: vi.fn(),
}));

describe("Página de Logística e Vendas (/vendas)", () => {
  const saidasMock: SaidaProducao[] = [
    {
      id: "saida-1",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 5000,
      transporte: "propria",
      data: new Date("2026-10-16"),
      responsavelId: "user-prod-1",
      ativo: true,
    },
  ];

  const pedidosMock: PedidoVenda[] = [
    {
      id: "ped-1",
      numeroPedido: 1001,
      clienteId: "cli-1",
      clienteNome: "Chaveiro Central",
      data: new Date("2026-10-16"),
      tipoEnvio: "lalamove",
      custoFreteCentavos: 2000,
      custoEmbalagemCentavos: 0,
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
      totalPedidoCentavos: 12000,
      totalUnidades: 1000,
      situacao: "pendente",
      responsavelId: "user-logistica-1",
      ativo: true,
      criadoEm: new Date("2026-10-16"),
      atualizadoEm: new Date("2026-10-16"),
    },
  ];

  const clientesMock = [
    { id: "cli-1", nome: "Chaveiro Central", cidade: "São Paulo", telefone: "11988887777" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(producaoService.listarSaidasAtivas).mockResolvedValue(saidasMock);
    vi.mocked(vendasService.listarPedidosVendas).mockResolvedValue(pedidosMock);
    vi.mocked(vendasService.listarClientesParaVenda).mockResolvedValue(clientesMock);
  });

  it("deve carregar dados e exibir o resumo de estoque de logística e a lista de pedidos", async () => {
    render(<VendasPage />);

    expect(screen.getByText(/carregando dados da logística e vendas/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/#1001/i)).toBeDefined();
    });

    // Saldo disponível: 5000 - 1000 = 4000
    expect(screen.getAllByText(/4\.000/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/chaveiro central/i)).toBeDefined();
  });

  it("deve abrir o modal de novo pedido ao clicar no botão de ação", async () => {
    render(<VendasPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /novo pedido/i })).toBeDefined();
    });

    const btnNovoPedido = screen.getByRole("button", { name: /novo pedido/i });
    fireEvent.click(btnNovoPedido);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /novo pedido de venda/i })).toBeDefined();
    });
  });
});
