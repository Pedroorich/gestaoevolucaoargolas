import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  criarLote,
  criarSaida,
  concluirBanhoRemessa,
  listarLotesAtivos,
  listarSaidasAtivas,
} from "@/lib/firebase/producao-service";
import {
  cadastrarClienteRapido,
  criarPedidoVenda,
  listarPedidosVendas,
} from "@/lib/firebase/vendas-service";
import {
  calcularSaldoLote,
  calcularEstoqueTotal,
} from "@/lib/producao/estoque";
import {
  calcularSaldoSaida,
  calcularEstoqueBanho,
} from "@/lib/vendas/vendas-engine";

describe("E2E Integrado: Ciclo Completo de Produção, Banho, Logística e Entrega com Endereço", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("deve executar o ciclo completo garantindo segregação de banho e registro de entrega", async () => {
    // 1. Fábrica registra lote de 10.000 argolas 19mm
    const loteId = await criarLote(
      {
        data: new Date(),
        modeloId: "argola-19mm",
        quantidadeProduzida: 10000,
        perdas: 0,
        responsavelId: "user-fabrica",
      },
      "user-fabrica",
      "Operador da Injetora"
    );

    let lotes = await listarLotesAtivos();
    let saidas = await listarSaidasAtivas();
    const lote = lotes.find((l) => l.id === loteId)!;
    expect(lote).toBeDefined();
    expect(calcularSaldoLote(lote, saidas)).toBe(10000);

    // 2. Envio de 4.000 unidades para o BANHO
    const saidaBanhoId = await criarSaida(
      {
        loteId,
        modeloId: "argola-19mm",
        quantidade: 4000,
        transporte: "van_propria",
        destino: "banho",
        responsavelId: "user-fabrica",
      },
      10000,
      "user-fabrica",
      "Operador da Injetora"
    );

    // 3. Envio de 3.000 unidades direto para o CENTRO DE LOGÍSTICA
    const saidaLogisticaId = await criarSaida(
      {
        loteId,
        modeloId: "argola-19mm",
        quantidade: 3000,
        transporte: "van_propria",
        destino: "centro_logistica",
        responsavelId: "user-fabrica",
      },
      6000, // saldo disponível após a primeira saída
      "user-fabrica",
      "Operador da Injetora"
    );

    saidas = await listarSaidasAtivas();
    lotes = await listarLotesAtivos();

    // 4. Verifica saldo na fábrica: 10.000 - 4.000 - 3.000 = 3.000 restantes
    expect(calcularSaldoLote(lote, saidas)).toBe(3000);

    // 5. Verifica segregação em logística e banho
    const saidaBanho = saidas.find((s) => s.id === saidaBanhoId)!;
    const saidaLogistica = saidas.find((s) => s.id === saidaLogisticaId)!;

    // Saída em banho tem saldo ZERO para vendas no centro de logística
    expect(calcularSaldoSaida(saidaBanho, [])).toBe(0);
    // Saída em logística tem 3.000 prontas para venda
    expect(calcularSaldoSaida(saidaLogistica, [])).toBe(3000);

    // Total em banho é contabilizado separadamente
    const saidasDoCiclo = saidas.filter((s) => s.id === saidaBanhoId || s.id === saidaLogisticaId);
    const estoqueBanho = calcularEstoqueBanho(saidasDoCiclo);
    expect(estoqueBanho.total).toBe(4000);
    expect(estoqueBanho.porModelo["argola-19mm"]).toBe(4000);

    // 6. Conclui o processo de banho (carga recebida no centro de logística)
    await concluirBanhoRemessa(saidaBanhoId, "user-logistica", "Motorista da Van");

    saidas = await listarSaidasAtivas();
    const saidaBanhoConcluido = saidas.find((s) => s.id === saidaBanhoId)!;
    expect(saidaBanhoConcluido.statusBanho).toBe("concluido");

    // Agora a remessa que veio do banho também está liberada para venda!
    expect(calcularSaldoSaida(saidaBanhoConcluido, [])).toBe(4000);
    // Total disponível na logística agora é 3.000 + 4.000 = 7.000
    const totalDisponivel =
      calcularSaldoSaida(saidaLogistica, []) + calcularSaldoSaida(saidaBanhoConcluido, []);
    expect(totalDisponivel).toBe(7000);

    // Cargas restantes em banho deste ciclo agora são 0
    expect(calcularEstoqueBanho([saidaBanhoConcluido, saidaLogistica]).total).toBe(0);

    // 7. Cadastro rápido de cliente com endereço
    const clienteId = await cadastrarClienteRapido(
      {
        nome: "Cortinas Imperial",
        telefone: "(11) 97777-8888",
        cidade: "São Paulo",
        endereco: "Rua do Gasômetro, 400 - Brás",
      },
      "user-logistica",
      "Vendedor"
    );

    // 8. Registro de pedido consumindo do lote que retornou do banho com endereço de entrega
    const pedidoId = await criarPedidoVenda(
      {
        clienteId,
        clienteNome: "Cortinas Imperial",
        enderecoEntrega: "Rua do Gasômetro, 400 - Depósito Fundos",
        tipoEnvio: "van_propria",
        custoFreteCentavos: 0,
        itens: [
          {
            modeloId: "argola-19mm",
            saidaId: saidaBanhoId,
            quantidadeUnidades: 3500,
            precoCentavos: 70000, // R$ 700,00
          },
        ],
        responsavelId: "user-logistica",
      },
      "user-logistica",
      "Vendedor"
    );

    expect(pedidoId).toBeDefined();

    const pedidos = await listarPedidosVendas();
    const pedido = pedidos.find((p) => p.id === pedidoId)!;
    expect(pedido).toBeDefined();
    expect(pedido.enderecoEntrega).toBe("Rua do Gasômetro, 400 - Depósito Fundos");
    expect(pedido.totalUnidades).toBe(3500);

    // Saldo restante daquela remessa pós-venda: 4.000 - 3.500 = 500
    expect(calcularSaldoSaida(saidaBanhoConcluido, pedidos)).toBe(500);
  });
});
