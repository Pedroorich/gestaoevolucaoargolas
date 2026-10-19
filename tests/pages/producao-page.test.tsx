import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProducaoPage from "@/app/producao/page";
import * as producaoService from "@/lib/firebase/producao-service";
import { LoteProducao, SaidaProducao } from "@/types/domain";

// Mock do hook useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      nome: "Carlos Produção",
      email: "carlos@evolucaoargolas.com.br",
      perfil: "producao",
      ativo: true,
      criadoEm: "2026-10-16",
    },
    loading: false,
    perfilAtual: "producao",
    alternarPerfilTeste: vi.fn(),
  }),
}));

// Mock do servico de producao
vi.mock("@/lib/firebase/producao-service", () => ({
  listarLotesAtivos: vi.fn(),
  listarSaidasAtivas: vi.fn(),
  criarLote: vi.fn(),
  criarSaida: vi.fn(),
  excluirLoteLogico: vi.fn(),
}));

describe("Página de Produção (/producao)", () => {
  const lotesIniciais: LoteProducao[] = [
    {
      id: "lote-101",
      data: new Date("2026-10-16T08:00:00Z"),
      modeloId: "argola-19mm",
      quantidadeProduzida: 5000,
      perdas: 200,
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    },
  ];

  const saidasIniciais: SaidaProducao[] = [
    {
      id: "saida-101",
      loteId: "lote-101",
      modeloId: "argola-19mm",
      quantidade: 1000,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(producaoService.listarLotesAtivos).mockResolvedValue(lotesIniciais);
    vi.mocked(producaoService.listarSaidasAtivas).mockResolvedValue(saidasIniciais);
  });

  it("deve carregar dados e exibir o resumo de estoque da fábrica", async () => {
    render(<ProducaoPage />);

    // Aguarda carregar lotes
    await waitFor(() => {
      // 5000 fabricadas - 200 perdas - 1000 saídas = 3800 disponível
      expect(screen.getAllByText(/3\.800/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole("heading", { level: 1, name: /Centro de Produção/i })).toBeDefined();
    expect(screen.getByText(/Lançar Novo Lote/i)).toBeDefined();
    expect(screen.getByText(/Registrar Saída para Van/i)).toBeDefined();
  });

  it("deve abrir o modal de novo lote ao clicar no botão de ação", async () => {
    render(<ProducaoPage />);

    await waitFor(() => {
      expect(screen.getByText(/Lançar Novo Lote/i)).toBeDefined();
    });

    const btnNovoLote = screen.getByRole("button", { name: /Lançar Novo Lote/i });
    fireEvent.click(btnNovoLote);

    expect(screen.getByText("Registrar Novo Lote")).toBeDefined();
  });

  it("deve abrir o modal de saída ao clicar em registrar saída", async () => {
    render(<ProducaoPage />);

    await waitFor(() => {
      expect(screen.getByText(/Registrar Saída para Van/i)).toBeDefined();
    });

    const btnSaida = screen.getByRole("button", { name: /Registrar Saída para Van/i });
    fireEvent.click(btnSaida);

    expect(screen.getByText("Colocar Argolas na Van")).toBeDefined();
  });
});
