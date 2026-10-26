import { describe, it, expect, vi, beforeEach } from "vitest";
import { criarSaida, concluirBanhoRemessa, listarSaidasAtivas } from "@/lib/firebase/producao-service";
import { cadastrarClienteRapido, criarPedidoVenda, listarClientesParaVenda, listarPedidosVendas } from "@/lib/firebase/vendas-service";

vi.mock("@/lib/firebase/client", () => ({
  db: {},
}));

describe("Serviços Firebase: Fluxo de Banho e Endereços", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("deve criar saída com destino banho e status inicial em_banho", async () => {
    const saidaId = await criarSaida(
      {
        loteId: "lote-teste-1",
        modeloId: "argola-19mm",
        quantidade: 2500,
        transporte: "van_propria",
        destino: "banho",
        responsavelId: "user-1",
      },
      5000,
      "user-1",
      "Operador Teste"
    );

    expect(saidaId).toBeDefined();

    const saidas = await listarSaidasAtivas();
    const saidaCriada = saidas.find((s) => s.id === saidaId);
    expect(saidaCriada).toBeDefined();
    expect(saidaCriada?.destino).toBe("banho");
    expect(saidaCriada?.statusBanho).toBe("em_banho");
  });

  it("deve concluir o banho de uma remessa e atualizar status para concluido", async () => {
    const saidaId = await criarSaida(
      {
        loteId: "lote-teste-2",
        modeloId: "argola-22mm",
        quantidade: 1000,
        transporte: "van_propria",
        destino: "banho",
        responsavelId: "user-1",
      },
      3000,
      "user-1",
      "Operador Teste"
    );

    await concluirBanhoRemessa(saidaId, "user-1", "Operador Teste");

    const saidas = await listarSaidasAtivas();
    const saidaAtualizada = saidas.find((s) => s.id === saidaId);
    expect(saidaAtualizada?.statusBanho).toBe("concluido");
    expect(saidaAtualizada?.dataRetornoBanho).toBeDefined();
  });

  it("deve cadastrar cliente com endereço e listar no seletor de vendas", async () => {
    const clienteId = await cadastrarClienteRapido(
      {
        nome: "Vidraçaria Alvorada",
        telefone: "(11) 98765-4321",
        cidade: "São Paulo",
        endereco: "Rua das Flores, 123 - Bairro Jardim",
      },
      "user-1",
      "Vendedor Teste"
    );

    expect(clienteId).toBeDefined();

    const clientes = await listarClientesParaVenda();
    const clienteEncontrado = clientes.find((c) => c.id === clienteId);
    expect(clienteEncontrado).toBeDefined();
    expect(clienteEncontrado?.endereco).toBe("Rua das Flores, 123 - Bairro Jardim");
  });

  it("deve salvar pedido de venda com endereço de entrega específico", async () => {
    const pedidoId = await criarPedidoVenda(
      {
        clienteId: "cli-123",
        clienteNome: "Vidraçaria Alvorada",
        enderecoEntrega: "Av. Paulista, 1000 - Galpão 4",
        tipoEnvio: "van_propria",
        custoFreteCentavos: 0,
        itens: [
          {
            modeloId: "argola-19mm",
            saidaId: "saida-qualquer",
            quantidadeUnidades: 500,
            precoCentavos: 10000,
          },
        ],
        responsavelId: "user-1",
      },
      "user-1",
      "Vendedor Teste"
    );

    expect(pedidoId).toBeDefined();

    const pedidos = await listarPedidosVendas();
    const pedidoEncontrado = pedidos.find((p) => p.id === pedidoId);
    expect(pedidoEncontrado).toBeDefined();
    expect(pedidoEncontrado?.enderecoEntrega).toBe("Av. Paulista, 1000 - Galpão 4");
  });
});
