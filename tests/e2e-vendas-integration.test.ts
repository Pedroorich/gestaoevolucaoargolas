import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calcularSaldoSaida,
  converterKgParaUnidades,
  validarItemPedido,
  validarPedidoCompleto,
  calcularTotaisPedido,
} from "@/lib/vendas/vendas-engine";
import {
  criarPedidoVenda,
  listarPedidosVendas,
  atualizarSituacaoPedido,
  excluirPedidoLogico,
  cadastrarClienteRapido,
  NovoPedidoInput,
} from "@/lib/firebase/vendas-service";
import { SaidaProducao, PedidoVenda } from "@/types/domain";

// Mock do Firebase Firestore
const mockAddDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  limit: (...args: any[]) => mockLimit(...args),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: () => new Date("2026-10-16T12:00:00Z"),
  getFirestore: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  db: {},
}));

describe("Cenário End-to-End de Aceite — Módulo Logística e Vendas (Fase 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: "mock-pedido-e2e-id" });
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it("deve executar todo o ciclo de vida: remessa da van, bloqueio por saldo insuficiente, venda multi-item (kg + un), frete terceirizado, baixa de saldo, entrega e devolução de saldo em cancelamento", async () => {
    // 1. Simulação: Remessa da van chega na logística com 4.000 unidades de argola 19mm
    const remessaVan: SaidaProducao = {
      id: "remessa-van-001",
      loteId: "lote-fabrica-101",
      modeloId: "argola-19mm",
      quantidade: 4000,
      transporte: "propria",
      data: new Date("2026-10-16T09:00:00Z"),
      responsavelId: "motorista-joao",
      ativo: true,
    };

    let pedidosAtivos: PedidoVenda[] = [];

    // Saldo inicial deve ser exatamente 4.000
    let saldoDisponivel = calcularSaldoSaida(remessaVan, pedidosAtivos);
    expect(saldoDisponivel).toBe(4000);

    // 2. Cliente A tenta comprar 10 kg de argola 19mm (950 un/kg -> ~9.500 unidades)
    const unidades10kg = converterKgParaUnidades("argola-19mm", 10);
    expect(unidades10kg).toBe(9500);

    const validacaoExcesso = validarItemPedido(
      {
        modeloId: "argola-19mm",
        saidaId: remessaVan.id,
        tipoUnidade: "kg",
        quantidade: 10,
        precoCentavos: 50000,
      },
      saldoDisponivel
    );

    // Deve BLOQUEAR porque 9.500 > 4.000
    expect(validacaoExcesso.valido).toBe(false);
    expect(validacaoExcesso.erro).toMatch(/maior do que o saldo disponível/i);

    // 3. Cliente A faz pedido multi-item permitido:
    // Item 1: 2 kg de argola 19mm (~1.900 unidades) por R$ 200,00 (20000 centavos)
    // Item 2: 500 unidades fracionadas por R$ 60,00 (6000 centavos)
    // Frete Lalamove: R$ 35,00 (3500 centavos)
    // Embalagem: R$ 5,00 (500 centavos)
    // Combustível: R$ 10,00 (1000 centavos)
    const unidades2kg = converterKgParaUnidades("argola-19mm", 2);
    expect(unidades2kg).toBe(1900);

    const validacaoItem1 = validarItemPedido(
      {
        modeloId: "argola-19mm",
        saidaId: remessaVan.id,
        tipoUnidade: "kg",
        quantidade: 2,
        precoCentavos: 20000,
      },
      saldoDisponivel
    );
    expect(validacaoItem1.valido).toBe(true);

    const validacaoItem2 = validarItemPedido(
      {
        modeloId: "argola-19mm",
        saidaId: remessaVan.id,
        tipoUnidade: "unidades",
        quantidade: 500,
        precoCentavos: 6000,
      },
      saldoDisponivel - validacaoItem1.unidadesCalculadas // 4000 - 1900 = 2100
    );
    expect(validacaoItem2.valido).toBe(true);

    // Validação consolidada do pedido
    const validacaoGeral = validarPedidoCompleto(
      {
        clienteId: "cli-artesanato-sp",
        tipoEnvio: "lalamove",
        freteCentavos: 3500,
        itens: [
          {
            modeloId: "argola-19mm",
            saidaId: remessaVan.id,
            quantidadeUnidades: 1900,
            precoCentavos: 20000,
          },
          {
            modeloId: "argola-19mm",
            saidaId: remessaVan.id,
            quantidadeUnidades: 500,
            precoCentavos: 6000,
          },
        ],
      },
      { [remessaVan.id]: saldoDisponivel }
    );
    expect(validacaoGeral.valido).toBe(true);

    // Totais calculados
    const totais = calcularTotaisPedido(
      [
        { quantidadeUnidades: 1900, precoCentavos: 20000 },
        { quantidadeUnidades: 500, precoCentavos: 6000 },
      ],
      3500
    );
    expect(totais.totalItensCentavos).toBe(26000); // R$ 260,00
    expect(totais.totalGeralCentavos).toBe(29500); // R$ 260,00 + R$ 35,00 = R$ 295,00
    expect(totais.totalUnidades).toBe(2400); // 1.900 + 500 = 2.400 unidades

    // 4. Cadastra pedido no Firestore
    mockGetDocs.mockResolvedValueOnce({ docs: [] }); // Simula primeiro pedido sequencial
    const pedidoInput: NovoPedidoInput = {
      clienteId: "cli-artesanato-sp",
      clienteNome: "Artesanato Bela Vista",
      tipoEnvio: "lalamove",
      custoFreteCentavos: 3500,
      custoEmbalagemCentavos: 500,
      custoCombustivelCentavos: 1000,
      itens: [
        {
          modeloId: "argola-19mm",
          saidaId: remessaVan.id,
          tipoUnidade: "kg",
          quantidade: 2,
          quantidadeUnidades: 1900,
          pesoKg: 2,
          precoCentavos: 20000,
        },
        {
          modeloId: "argola-19mm",
          saidaId: remessaVan.id,
          tipoUnidade: "unidades",
          quantidade: 500,
          quantidadeUnidades: 500,
          pesoKg: null,
          precoCentavos: 6000,
        },
      ],
      responsavelId: "user-logistica-1",
    };

    const pedidoCriadoId = await criarPedidoVenda(
      pedidoInput,
      "user-logistica-1",
      "Marcos Logística"
    );
    expect(pedidoCriadoId).toBe("mock-pedido-e2e-id");

    // Registra o pedido na lista de pedidos ativos
    const pedidoSalvo: PedidoVenda = {
      id: pedidoCriadoId,
      numeroPedido: 1001,
      clienteId: pedidoInput.clienteId,
      clienteNome: pedidoInput.clienteNome,
      data: new Date("2026-10-16"),
      tipoEnvio: pedidoInput.tipoEnvio,
      custoFreteCentavos: pedidoInput.custoFreteCentavos,
      custoEmbalagemCentavos: pedidoInput.custoEmbalagemCentavos || 0,
      custoCombustivelCentavos: pedidoInput.custoCombustivelCentavos || 0,
      itens: pedidoInput.itens as any,
      totalItensCentavos: 26000,
      totalPedidoCentavos: 29500,
      totalUnidades: 2400,
      situacao: "pendente",
      responsavelId: "user-logistica-1",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };
    pedidosAtivos.push(pedidoSalvo);

    // 5. Verifica se o saldo restante da remessa caiu de 4.000 para 1.600
    saldoDisponivel = calcularSaldoSaida(remessaVan, pedidosAtivos);
    expect(saldoDisponivel).toBe(1600); // 4000 - 2400 = 1600

    // 6. Cliente B tenta comprar 2.000 unidades contra o saldo restante de 1.600
    const validacaoClienteB = validarItemPedido(
      {
        modeloId: "argola-19mm",
        saidaId: remessaVan.id,
        tipoUnidade: "unidades",
        quantidade: 2000,
        precoCentavos: 20000,
      },
      saldoDisponivel // 1600
    );
    // Deve BLOQUEAR porque 2.000 > 1.600
    expect(validacaoClienteB.valido).toBe(false);
    expect(validacaoClienteB.erro).toMatch(/maior do que o saldo disponível/i);

    // 7. Logística conclui a entrega do Pedido 1001 (altera para "entregue")
    await atualizarSituacaoPedido(
      pedidoCriadoId,
      "entregue",
      "user-logistica-1",
      "Marcos Logística"
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        situacao: "entregue",
      })
    );
    pedidoSalvo.situacao = "entregue";

    // Saldo continua deduzido mesmo entregue
    expect(calcularSaldoSaida(remessaVan, pedidosAtivos)).toBe(1600);

    // 8. Se o pedido for cancelado / excluído logicamente, o saldo é integralmente devolvido
    await excluirPedidoLogico(
      pedidoCriadoId,
      "user-logistica-1",
      "Marcos Logística"
    );
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        ativo: false,
      })
    );
    pedidoSalvo.ativo = false;

    // Saldo volta a ser 4.000
    const saldoRestaurado = calcularSaldoSaida(remessaVan, pedidosAtivos);
    expect(saldoRestaurado).toBe(4000);
  });
});
