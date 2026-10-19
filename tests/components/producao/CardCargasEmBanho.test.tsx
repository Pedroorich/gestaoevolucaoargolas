import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CardCargasEmBanho from "@/components/producao/CardCargasEmBanho";
import { SaidaProducao } from "@/types/domain";

describe("Componente CardCargasEmBanho", () => {
  const saidasEmBanhoExemplo: SaidaProducao[] = [
    {
      id: "saida-banho-101",
      loteId: "lote-abc",
      modeloId: "argola-19mm",
      quantidade: 3500,
      transporte: "van_propria",
      destino: "banho",
      statusBanho: "em_banho",
      data: new Date("2026-10-16T10:00:00Z"),
      responsavelId: "user-1",
      ativo: true,
    },
  ];

  it("deve exibir a lista de cargas em banho com quantidade e modelo", () => {
    render(
      <CardCargasEmBanho
        cargasEmBanho={saidasEmBanhoExemplo}
        onConcluirBanho={vi.fn()}
      />
    );

    expect(screen.getByText("Argolas em Processo de Banho")).toBeDefined();
    expect(screen.getByText("Argola 19mm")).toBeDefined();
    expect(screen.getByText(/3\.500 un/)).toBeDefined();
  });

  it("deve permitir acionar a conclusão do banho para enviar ao centro de logística", async () => {
    const mockConcluir = vi.fn().mockResolvedValue(undefined);
    render(
      <CardCargasEmBanho
        cargasEmBanho={saidasEmBanhoExemplo}
        onConcluirBanho={mockConcluir}
      />
    );

    const btnConcluir = screen.getByRole("button", {
      name: /Receber do Banho -> Enviar p\/ Logística/i,
    });
    fireEvent.click(btnConcluir);

    expect(mockConcluir).toHaveBeenCalledWith("saida-banho-101");
  });

  it("não deve exibir o card quando não houver cargas em banho", () => {
    const { container } = render(
      <CardCargasEmBanho
        cargasEmBanho={[]}
        onConcluirBanho={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
