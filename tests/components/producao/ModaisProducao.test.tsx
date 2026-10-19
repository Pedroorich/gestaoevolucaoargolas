import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ModalNovoLote from "@/components/producao/ModalNovoLote";
import ModalNovaSaida from "@/components/producao/ModalNovaSaida";
import { LoteProducao } from "@/types/domain";

describe("Modais de Produção", () => {
  describe("ModalNovoLote", () => {
    it("deve renderizar campos com rótulos em português simples", () => {
      render(
        <ModalNovoLote
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("Registrar Novo Lote")).toBeDefined();
      expect(screen.getByLabelText(/Modelo da argola/i)).toBeDefined();
      expect(screen.getByLabelText(/Quantidade fabricada/i)).toBeDefined();
      expect(screen.getByLabelText(/Argolas com defeito/i)).toBeDefined();
    });

    it("deve validar preenchimento e chamar onSubmit com valores corretos", async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ModalNovoLote
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
        />
      );

      fireEvent.change(screen.getByLabelText(/Quantidade fabricada/i), {
        target: { value: "5000" },
      });
      fireEvent.change(screen.getByLabelText(/Argolas com defeito/i), {
        target: { value: "100" },
      });

      const btnSalvar = screen.getByRole("button", { name: /Salvar Lote/i });
      fireEvent.click(btnSalvar);

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantidadeProduzida: 5000,
          perdas: 100,
        })
      );
    });

    it("deve permitir salvar lote informando apenas o peso em quilos (kg)", async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ModalNovoLote
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
        />
      );

      // Argola 16mm (primeiro do catalogo) tem 1200 un/kg -> 3 kg = 3600 un
      fireEvent.change(screen.getByLabelText(/Peso em quilos/i), {
        target: { value: "3" },
      });

      const btnSalvar = screen.getByRole("button", { name: /Salvar Lote/i });
      fireEvent.click(btnSalvar);

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantidadeProduzida: 3600,
          pesoKg: 3,
        })
      );
    });

    it("deve exibir erro se nem unidades nem peso em quilos forem informados", async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ModalNovoLote
          isOpen={true}
          onClose={vi.fn()}
          onSubmit={mockSubmit}
        />
      );

      const btnSalvar = screen.getByRole("button", { name: /Salvar Lote/i });
      fireEvent.click(btnSalvar);

      expect(mockSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/Informe a quantidade fabricada/i)).toBeDefined();
    });
  });

  describe("ModalNovaSaida", () => {
    const lotesDisponiveis = [
      {
        lote: {
          id: "lote-1",
          data: new Date("2026-10-16"),
          modeloId: "argola-19mm",
          quantidadeProduzida: 5000,
          perdas: 200,
          responsavelId: "user-1",
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        } as LoteProducao,
        saldoDisponivel: 4800,
      },
    ];

    it("deve exibir lotes com saldo disponível para colocar na van", () => {
      render(
        <ModalNovaSaida
          isOpen={true}
          onClose={vi.fn()}
          lotesDisponiveis={lotesDisponiveis}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("Colocar Argolas na Van")).toBeDefined();
      expect(screen.getByLabelText(/Selecione o lote de origem/i)).toBeDefined();
      expect(screen.getByText(/Saldo: 4\.800 argolas/i)).toBeDefined();
    });

    it("deve alertar se a quantidade inserida for maior que o saldo do lote", async () => {
      render(
        <ModalNovaSaida
          isOpen={true}
          onClose={vi.fn()}
          lotesDisponiveis={lotesDisponiveis}
          onSubmit={vi.fn()}
        />
      );

      const inputQtd = screen.getByLabelText(/Quantidade para colocar na van/i);
      fireEvent.change(inputQtd, { target: { value: "5000" } });

      const form = screen.getByRole("button", { name: /Confirmar Envio/i }).closest("form")!;
      fireEvent.submit(form);

      expect(
        screen.getByText(/Quantidade informada é maior do que o saldo disponível/i)
      ).toBeDefined();
    });

    it("deve permitir selecionar destino banho e enviar com sucesso", async () => {
      const mockSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <ModalNovaSaida
          isOpen={true}
          onClose={vi.fn()}
          lotesDisponiveis={lotesDisponiveis}
          onSubmit={mockSubmit}
        />
      );

      const inputQtd = screen.getByLabelText(/Quantidade para colocar na van/i);
      fireEvent.change(inputQtd, { target: { value: "2000" } });

      const radioBanho = screen.getByLabelText(/Banho \/ Metalização/i);
      fireEvent.click(radioBanho);

      const form = screen.getByRole("button", { name: /Confirmar Envio/i }).closest("form")!;
      fireEvent.submit(form);

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          quantidade: 2000,
          destino: "banho",
        })
      );
    });
  });
});
