import { describe, it, expect } from "vitest";
import {
  calcularSaldoLote,
  calcularEstoquePorModelo,
  calcularEstoqueTotal,
  validarNovoLote,
  validarNovaSaida,
} from "@/lib/producao/estoque";
import { LoteProducao, SaidaProducao, CATALOGO_ARGOLAS } from "@/types/domain";

describe("Engine de Estoque e Validações de Produção", () => {
  const loteExemplo: LoteProducao = {
    id: "lote-1",
    data: new Date("2026-10-16T10:00:00Z"),
    modeloId: "argola-19mm",
    quantidadeProduzida: 5000,
    perdas: 150,
    custoMaterialCentavos: 50000, // R$ 500,00
    custoUnitarioCentavos: 10,
    responsavelId: "user-1",
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  const saidasExemplo: SaidaProducao[] = [
    {
      id: "saida-1",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 1000,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: true,
    },
    {
      id: "saida-2",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 850,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: true,
    },
    {
      id: "saida-cancelada",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 500,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: false, // exclusão lógica
    },
  ];

  describe("calcularSaldoLote", () => {
    it("deve calcular o saldo disponível subtraindo perdas e saídas ativas", () => {
      // 5000 produzidas - 150 perdas - (1000 + 850) saídas ativas = 3000
      const saldo = calcularSaldoLote(loteExemplo, saidasExemplo);
      expect(saldo).toBe(3000);
    });

    it("deve retornar 0 se o lote estiver inativo (exclusão lógica)", () => {
      const loteInativo: LoteProducao = { ...loteExemplo, ativo: false };
      const saldo = calcularSaldoLote(loteInativo, saidasExemplo);
      expect(saldo).toBe(0);
    });

    it("deve ignorar saídas de outros lotes", () => {
      const saidasComOutroLote: SaidaProducao[] = [
        ...saidasExemplo,
        {
          id: "saida-outro",
          loteId: "outro-lote",
          modeloId: "argola-19mm",
          quantidade: 1000,
          transporte: "van_propria",
          data: new Date(),
          responsavelId: "user-1",
          ativo: true,
        },
      ];
      const saldo = calcularSaldoLote(loteExemplo, saidasComOutroLote);
      expect(saldo).toBe(3000);
    });
  });

  describe("calcularEstoquePorModelo", () => {
    it("deve agregar a produção, perdas, saídas e saldo para cada um dos 7 modelos", () => {
      const lotes: LoteProducao[] = [
        loteExemplo,
        {
          id: "lote-2",
          data: new Date(),
          modeloId: "argola-22mm",
          quantidadeProduzida: 10000,
          perdas: 200,
          custoMaterialCentavos: 120000,
          custoUnitarioCentavos: 12,
          responsavelId: "user-1",
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ];

      const resultado = calcularEstoquePorModelo(lotes, saidasExemplo);

      // Argola 19mm: 5000 - 150 perdas - 1850 saídas = 3000 disponível
      expect(resultado["argola-19mm"]).toEqual({
        produzido: 5000,
        perdas: 150,
        enviado: 1850,
        disponivel: 3000,
      });

      // Argola 22mm: 10000 - 200 perdas - 0 saídas = 9800 disponível
      expect(resultado["argola-22mm"]).toEqual({
        produzido: 10000,
        perdas: 200,
        enviado: 0,
        disponivel: 9800,
      });

      // Modelos sem lote devem ter todos os valores zerados
      expect(resultado["argola-16mm"]).toEqual({
        produzido: 0,
        perdas: 0,
        enviado: 0,
        disponivel: 0,
      });
    });

    it("não deve permitir que saídas de um lote desativado diminuam o saldo de outros lotes ativos do mesmo modelo", () => {
      const loteAtivo: LoteProducao = {
        id: "lote-ativo",
        data: new Date(),
        modeloId: "argola-19mm",
        quantidadeProduzida: 5000,
        perdas: 0,
        responsavelId: "user-1",
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      const loteInativo: LoteProducao = {
        id: "lote-inativo",
        data: new Date(),
        modeloId: "argola-19mm",
        quantidadeProduzida: 5000,
        perdas: 0,
        responsavelId: "user-1",
        ativo: false, // desativado
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      const saidasComLoteInativo: SaidaProducao[] = [
        {
          id: "saida-lote-inativo",
          loteId: "lote-inativo",
          modeloId: "argola-19mm",
          quantidade: 1000,
          transporte: "van_propria",
          data: new Date(),
          responsavelId: "user-1",
          ativo: true,
        },
      ];

      const res = calcularEstoquePorModelo([loteAtivo, loteInativo], saidasComLoteInativo);

      // O lote ativo tem 5000 e 0 saídas próprias. Seu saldo deve ser 5000, e NÃO 4000.
      expect(res["argola-19mm"].disponivel).toBe(5000);
      expect(res["argola-19mm"].enviado).toBe(0);
    });
  });

  describe("calcularEstoqueTotal", () => {
    it("deve somar o total consolidado da fábrica", () => {
      const lotes: LoteProducao[] = [
        loteExemplo,
        {
          id: "lote-2",
          data: new Date(),
          modeloId: "argola-22mm",
          quantidadeProduzida: 10000,
          perdas: 200,
          custoMaterialCentavos: 120000,
          custoUnitarioCentavos: 12,
          responsavelId: "user-1",
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        },
      ];

      const total = calcularEstoqueTotal(lotes, saidasExemplo);
      expect(total).toEqual({
        produzido: 15000,
        perdas: 350,
        enviado: 1850,
        disponivel: 12800,
      });
    });
  });

  describe("validarNovoLote", () => {
    it("deve aprovar lote válido com modelo existente do catálogo", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 2000,
        perdas: 50,
      });
      expect(res.valido).toBe(true);
      expect(res.erro).toBeUndefined();
    });

    it("deve rejeitar modelo inexistente no catálogo", () => {
      const res = validarNovoLote({
        modeloId: "argola-inexistente-99mm",
        quantidadeProduzida: 1000,
        perdas: 10,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Modelo de argola não encontrado");
    });

    it("deve rejeitar quantidade produzida menor ou igual a zero", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 0,
        perdas: 0,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Quantidade produzida deve ser um número inteiro maior que zero");
    });

    it("deve rejeitar perdas negativas", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 1000,
        perdas: -5,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Argolas com defeito (perdas) devem ser um número inteiro não-negativo");
    });

    it("deve rejeitar perdas maiores que a quantidade produzida", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 500,
        perdas: 600,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Perdas não podem ser maiores do que a quantidade produzida");
    });

    it("deve rejeitar quantidade produzida fracionária / não inteira", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 100.5,
        perdas: 0,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Quantidade produzida deve ser um número inteiro maior que zero");
    });

    it("deve rejeitar perdas fracionárias / não inteiras", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 1000,
        perdas: 5.5,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Argolas com defeito (perdas) devem ser um número inteiro não-negativo");
    });

    it("deve aprovar lote preenchido apenas com peso em quilos e calcular unidades", () => {
      // Argola 19mm tem 950 un/kg
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        pesoKg: 2,
        perdas: 10,
      });
      expect(res.valido).toBe(true);
      expect(res.quantidadeProduzidaFinal).toBe(1900); // 2 * 950
      expect(res.pesoKgFinal).toBe(2);
    });

    it("deve rejeitar se nem unidades nem peso em quilos forem informados", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        perdas: 0,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Informe a quantidade fabricada (em unidades) ou o peso (em quilos)");
    });

    it("deve aceitar quando tanto unidades quanto peso em quilos forem informados", () => {
      const res = validarNovoLote({
        modeloId: "argola-19mm",
        quantidadeProduzida: 2000,
        pesoKg: 2.1,
        perdas: 0,
      });
      expect(res.valido).toBe(true);
      expect(res.quantidadeProduzidaFinal).toBe(2000);
      expect(res.pesoKgFinal).toBe(2.1);
    });
  });

  describe("validarNovaSaida", () => {
    it("deve rejeitar saída com quantidade fracionária / não inteira", () => {
      const res = validarNovaSaida({
        loteId: "lote-1",
        quantidade: 10.5,
        saldoDisponivel: 1000,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Quantidade deve ser um número inteiro maior que zero");
    });
    it("deve aprovar saída dentro do saldo disponível", () => {
      const res = validarNovaSaida({
        loteId: "lote-1",
        quantidade: 1000,
        saldoDisponivel: 3000,
      });
      expect(res.valido).toBe(true);
      expect(res.erro).toBeUndefined();
    });

    it("deve rejeitar saída com quantidade menor ou igual a zero", () => {
      const res = validarNovaSaida({
        loteId: "lote-1",
        quantidade: 0,
        saldoDisponivel: 1000,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toContain("Quantidade deve ser um número inteiro maior que zero");
    });

    it("deve rejeitar saída maior que o saldo disponível do lote", () => {
      const res = validarNovaSaida({
        loteId: "lote-1",
        quantidade: 3500,
        saldoDisponivel: 3000,
      });
      expect(res.valido).toBe(false);
      expect(res.erro).toBe("Quantidade informada é maior do que o saldo disponível neste lote");
    });
  });
});
