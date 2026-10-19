import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TabelaLotesRecentes from "@/components/producao/TabelaLotesRecentes";
import { LoteProducao, SaidaProducao } from "@/types/domain";

describe("Componente TabelaLotesRecentes", () => {
  const lotesExemplo: LoteProducao[] = [
    {
      id: "lote-abc12345",
      data: new Date("2026-10-16T10:00:00Z"),
      modeloId: "argola-19mm",
      quantidadeProduzida: 5000,
      perdas: 150,
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      observacoes: "Teste de lote inicial",
    },
  ];

  const saidasExemplo: SaidaProducao[] = [
    {
      id: "saida-1",
      loteId: "lote-abc12345",
      modeloId: "argola-19mm",
      quantidade: 1000,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: true,
    },
  ];

  it("deve listar os lotes recentes com saldo e detalhes", () => {
    render(
      <TabelaLotesRecentes
        lotes={lotesExemplo}
        saidas={saidasExemplo}
      />
    );

    expect(screen.getByText("Argola 19mm")).toBeDefined();
    expect(screen.getByText(/Lote lote-a/i)).toBeDefined();
    expect(screen.getByText(/5\.000 un/)).toBeDefined(); // Fabricado
    expect(screen.getByText("150")).toBeDefined(); // Perdas
    expect(screen.getByText("1.000")).toBeDefined(); // Enviado
    expect(screen.getByText("3.850")).toBeDefined(); // Saldo restante (5000 - 150 - 1000)
  });

  it("deve exibir o peso em kg quando o lote possuir peso informado", () => {
    const loteComKg: LoteProducao = {
      ...lotesExemplo[0],
      pesoKg: 5,
    };
    render(
      <TabelaLotesRecentes
        lotes={[loteComKg]}
        saidas={[]}
      />
    );
    expect(screen.getByText(/5\.000 un \(5 kg\)/)).toBeDefined();
  });

  it("deve permitir acionar exclusão lógica de lote sem saídas com confirmação de motivo", async () => {
    const mockExcluir = vi.fn().mockResolvedValue(undefined);
    render(
      <TabelaLotesRecentes
        lotes={lotesExemplo}
        saidas={[]} // Sem saídas
        onExcluirLote={mockExcluir}
      />
    );

    const btnExcluir = screen.getByRole("button", { name: /Excluir Lote/i });
    fireEvent.click(btnExcluir);

    expect(screen.getByText("Confirmar Exclusão de Lote")).toBeDefined();

    const inputMotivo = screen.getByLabelText(/Motivo da exclusão/i);
    fireEvent.change(inputMotivo, { target: { value: "Lançamento duplicado" } });

    const btnConfirmar = screen.getByRole("button", { name: /Confirmar Exclusão/i });
    fireEvent.click(btnConfirmar);

    expect(mockExcluir).toHaveBeenCalledWith("lote-abc12345", "Lançamento duplicado");
  });

  it("deve bloquear a exclusão se o lote já tiver argolas enviadas na van", () => {
    render(
      <TabelaLotesRecentes
        lotes={lotesExemplo}
        saidas={saidasExemplo}
        onExcluirLote={vi.fn()}
      />
    );

    expect(screen.getByText(/Bloqueado \(Argolas já enviadas na Van\)/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /Excluir Lote/i })).toBeNull();
  });
});
