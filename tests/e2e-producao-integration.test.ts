import { describe, it, expect } from "vitest";
import {
  calcularSaldoLote,
  calcularEstoquePorModelo,
  calcularEstoqueTotal,
  validarNovoLote,
  validarNovaSaida,
} from "@/lib/producao/estoque";
import { LoteProducao, SaidaProducao, CATALOGO_ARGOLAS } from "@/types/domain";

describe("Verificação de Aceite E2E — Fase 2 (Módulo Produção)", () => {
  it("Fluxo completo de fabricação, perdas, saídas na van, bloqueio de saldo e exclusão lógica", () => {
    // 1. Fabricação de lote de 5.000 unidades de Argola 19mm com 150 defeitos
    const validacaoLote = validarNovoLote({
      modeloId: "argola-19mm",
      quantidadeProduzida: 5000,
      perdas: 150,
    });
    expect(validacaoLote.valido).toBe(true);

    const lote1: LoteProducao = {
      id: "lote-e2e-001",
      data: new Date("2026-10-16T08:00:00Z"),
      modeloId: "argola-19mm",
      quantidadeProduzida: 5000,
      perdas: 150,
      custoMaterialCentavos: 50000,
      custoUnitarioCentavos: 10,
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    let saidas: SaidaProducao[] = [];

    // 2. Saldo disponível inicial do lote deve ser 5000 - 150 = 4850
    let saldoAtual = calcularSaldoLote(lote1, saidas);
    expect(saldoAtual).toBe(4850);

    // 3. Envio de 2.000 unidades na van para logística
    const validacaoSaida1 = validarNovaSaida({
      loteId: lote1.id,
      quantidade: 2000,
      saldoDisponivel: saldoAtual,
    });
    expect(validacaoSaida1.valido).toBe(true);

    const saida1: SaidaProducao = {
      id: "saida-e2e-001",
      loteId: lote1.id,
      modeloId: "argola-19mm",
      quantidade: 2000,
      transporte: "van_propria",
      data: new Date(),
      responsavelId: "user-1",
      ativo: true,
    };
    saidas.push(saida1);

    // 4. Saldo após a saída deve ser 4850 - 2000 = 2850
    saldoAtual = calcularSaldoLote(lote1, saidas);
    expect(saldoAtual).toBe(2850);

    // 5. Tentativa de enviar mais 3.000 unidades (quando só restam 2.850) DEVE FALHAR
    const validacaoSaidaInvalida = validarNovaSaida({
      loteId: lote1.id,
      quantidade: 3000,
      saldoDisponivel: saldoAtual,
    });
    expect(validacaoSaidaInvalida.valido).toBe(false);
    expect(validacaoSaidaInvalida.erro).toBe(
      "Quantidade informada é maior do que o saldo disponível neste lote"
    );

    // 6. Cadastrar um segundo lote (Argola 22mm: 10.000 produzidas, 300 perdas)
    const lote2: LoteProducao = {
      id: "lote-e2e-002",
      data: new Date("2026-10-16T11:00:00Z"),
      modeloId: "argola-22mm",
      quantidadeProduzida: 10000,
      perdas: 300,
      responsavelId: "user-1",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    const lotes = [lote1, lote2];

    // 7. Consolidação de estoque da fábrica
    const estoqueTotal = calcularEstoqueTotal(lotes, saidas);
    // Produzido: 5000 + 10000 = 15000
    // Perdas: 150 + 300 = 450
    // Enviado: 2000
    // Disponível: 15000 - 450 - 2000 = 12550
    expect(estoqueTotal).toEqual({
      produzido: 15000,
      perdas: 450,
      enviado: 2000,
      disponivel: 12550,
    });

    const estoqueModelos = calcularEstoquePorModelo(lotes, saidas);
    expect(estoqueModelos["argola-19mm"].disponivel).toBe(2850);
    expect(estoqueModelos["argola-22mm"].disponivel).toBe(9700);

    // 8. Exclusão lógica do lote 1: o saldo do lote 1 zera no estoque disponível
    const lote1Desativado: LoteProducao = { ...lote1, ativo: false };
    const lotesComExclusao = [lote1Desativado, lote2];

    const estoqueAposExclusao = calcularEstoqueTotal(lotesComExclusao, saidas);
    // Argola 19mm agora está desativada, sobrando apenas lote 2 (9700)
    expect(estoqueAposExclusao.disponivel).toBe(9700);
  });

  it("Todos os 7 modelos do catálogo de argolas devem estar presentes e inicializados", () => {
    expect(CATALOGO_ARGOLAS).toHaveLength(7);

    const modelosIds = CATALOGO_ARGOLAS.map((m) => m.id);
    expect(modelosIds).toContain("argola-16mm");
    expect(modelosIds).toContain("argola-19mm");
    expect(modelosIds).toContain("argola-19mm-corrente");
    expect(modelosIds).toContain("argola-22mm");
    expect(modelosIds).toContain("argola-22mm-batida");
    expect(modelosIds).toContain("argola-22mm-corrente");
    expect(modelosIds).toContain("argola-25mm");

    const estoqueZerado = calcularEstoquePorModelo([], []);
    for (const id of modelosIds) {
      expect(estoqueZerado[id]).toEqual({
        produzido: 0,
        perdas: 0,
        enviado: 0,
        disponivel: 0,
      });
    }
  });
});
