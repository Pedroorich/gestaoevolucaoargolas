import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  criarPedidoVenda,
  listarPedidosVendas,
  observarPedidosVendas,
  atualizarSituacaoPedido,
  cadastrarClienteRapido,
  listarClientesParaVenda,
  observarClientes,
  excluirPedidoLogico,
  NovoPedidoInput,
} from "@/lib/firebase/vendas-service";

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

describe("Serviço Firestore de Vendas, Clientes e Logística", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: "mock-pedido-id" });
    mockUpdateDoc.mockResolvedValue(undefined);
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  describe("criarPedidoVenda", () => {
    it("deve cadastrar pedido de venda com itens válidos e registrar log de auditoria", async () => {
      // Simula consulta de número sequencial retornando nenhum pedido prévio
      mockGetDocs.mockResolvedValueOnce({
        docs: [],
        forEach: (fn: any) => [],
      });

      const pedidoInput: NovoPedidoInput = {
        clienteId: "cli-123",
        clienteNome: "Biju Artesanato",
        tipoEnvio: "lalamove",
        custoFreteCentavos: 2500, // R$ 25,00
        custoEmbalagemCentavos: 500, // R$ 5,00
        custoCombustivelCentavos: 1000, // R$ 10,00
        itens: [
          {
            modeloId: "argola-19mm",
            saidaId: "saida-van-01",
            tipoUnidade: "unidades",
            quantidade: 1000,
            quantidadeUnidades: 1000,
            precoCentavos: 10000, // R$ 100,00
          },
        ],
        responsavelId: "user-logistica-1",
      };

      const id = await criarPedidoVenda(pedidoInput, "user-logistica-1", "Marcos Logística");

      expect(id).toBe("mock-pedido-id");
      expect(mockAddDoc).toHaveBeenCalledTimes(2); // Pedido + Log de Auditoria
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "pedidos_vendas");
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "logs_auditoria");

      // Deve salvar os totais corretos em centavos
      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          numeroPedido: 1001,
          clienteNome: "Biju Artesanato",
          tipoEnvio: "lalamove",
          totalItensCentavos: 10000,
          totalPedidoCentavos: 12500, // 10000 + 2500 de frete
          totalUnidades: 1000,
          situacao: "pendente",
          ativo: true,
        })
      );
    });

    it("deve rejeitar pedido sem itens", async () => {
      const pedidoInvalido: NovoPedidoInput = {
        clienteId: "cli-123",
        clienteNome: "Biju Artesanato",
        tipoEnvio: "retirada",
        custoFreteCentavos: 0,
        itens: [],
        responsavelId: "user-logistica-1",
      };

      await expect(
        criarPedidoVenda(pedidoInvalido, "user-logistica-1", "Marcos Logística")
      ).rejects.toThrow("O pedido deve conter pelo menos um item");
    });

    it("deve rejeitar pedido sem cliente", async () => {
      const pedidoInvalido: NovoPedidoInput = {
        clienteId: "",
        clienteNome: "",
        tipoEnvio: "retirada",
        custoFreteCentavos: 0,
        itens: [
          {
            modeloId: "argola-19mm",
            saidaId: "saida-van-01",
            tipoUnidade: "unidades",
            quantidade: 200,
            quantidadeUnidades: 200,
            precoCentavos: 2000,
          },
        ],
        responsavelId: "user-logistica-1",
      };

      await expect(
        criarPedidoVenda(pedidoInvalido, "user-logistica-1", "Marcos Logística")
      ).rejects.toThrow("Selecione um cliente para a venda");
    });
  });

  describe("listarPedidosVendas", () => {
    it("deve listar apenas pedidos ativos", async () => {
      const docsFalsos = [
        {
          id: "ped-1",
          data: () => ({
            numeroPedido: 1001,
            clienteId: "cli-1",
            clienteNome: "Chaveiro Central",
            data: { toDate: () => new Date("2026-10-16") },
            tipoEnvio: "propria",
            custoFreteCentavos: 0,
            custoEmbalagemCentavos: 0,
            itens: [],
            totalItensCentavos: 5000,
            totalPedidoCentavos: 5000,
            totalUnidades: 500,
            situacao: "entregue",
            ativo: true,
            criadoEm: { toDate: () => new Date("2026-10-16") },
            atualizadoEm: { toDate: () => new Date("2026-10-16") },
          }),
        },
      ];

      mockGetDocs.mockResolvedValueOnce({
        docs: docsFalsos,
      });

      const pedidos = await listarPedidosVendas();
      expect(pedidos).toHaveLength(1);
      expect(pedidos[0].numeroPedido).toBe(1001);
      expect(pedidos[0].clienteNome).toBe("Chaveiro Central");
      expect(mockWhere).toHaveBeenCalledWith("ativo", "==", true);
    });
  });

  describe("atualizarSituacaoPedido", () => {
    it("deve atualizar situação do pedido e registrar log de auditoria", async () => {
      await atualizarSituacaoPedido("ped-123", "separado", "user-log-1", "Marcos Logística");

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          situacao: "separado",
        })
      );

      // Log de auditoria
      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          acao: "EDITAR",
          tabela: "pedidos_vendas",
          registroId: "ped-123",
          valoresNovos: { situacao: "separado" },
        })
      );
    });

    it("ao marcar como entregue, deve atualizar métricas do cliente e promover a cliente_fiel após 3 compras", async () => {
      // Simula getDoc para o pedido
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ clienteId: "cli-123" }),
      });
      // Simula getDoc para o cliente (já tem 2 compras, vai para 3 -> cliente_fiel)
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ totalCompras: 2, situacao: "ja_comprou" }),
      });

      await atualizarSituacaoPedido("ped-123", "entregue", "user-log-1", "Marcos Logística");

      // Deve atualizar o pedido E o cliente
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          situacao: "entregue",
        })
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          totalCompras: 3,
          situacao: "cliente_fiel",
        })
      );
    });
  });

  describe("cadastrarClienteRapido e listarClientesParaVenda", () => {
    it("deve cadastrar cliente rapidamente com dados mínimos e auditoria", async () => {
      mockAddDoc.mockResolvedValueOnce({ id: "mock-cliente-id" });

      const clienteId = await cadastrarClienteRapido(
        {
          nome: "Distribuidora ABC",
          telefone: "11988887777",
          cidade: "São Paulo",
        },
        "user-log-1",
        "Marcos Logística"
      );

      expect(clienteId).toBe("mock-cliente-id");
      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          nome: "Distribuidora ABC",
          telefone: "11988887777",
          cidade: "São Paulo",
          totalCompras: 0,
          ativo: true,
        })
      );
      // Log de auditoria do cliente
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "logs_auditoria");
    });

    it("deve rejeitar cadastro de cliente com nome vazio", async () => {
      await expect(
        cadastrarClienteRapido(
          { nome: "   ", telefone: "", cidade: "" },
          "user-log-1",
          "Marcos"
        )
      ).rejects.toThrow("Nome do cliente é obrigatório");
    });

    it("deve listar clientes ativos para a venda", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "cli-1",
            data: () => ({
              nome: "Cliente Ativo",
              telefone: "11999999999",
              cidade: "Guarulhos",
              ativo: true,
            }),
          },
        ],
      });

      const clientes = await listarClientesParaVenda();
      expect(clientes).toHaveLength(1);
      expect(clientes[0].nome).toBe("Cliente Ativo");
      expect(mockWhere).toHaveBeenCalledWith("ativo", "==", true);
    });
  });

  describe("excluirPedidoLogico", () => {
    it("deve desativar pedido logicamente e registrar log de auditoria", async () => {
      await excluirPedidoLogico("ped-123", "user-log-1", "Marcos Logística");

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          ativo: false,
        })
      );

      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          acao: "EXCLUIR_LOGICO",
          tabela: "pedidos_vendas",
          registroId: "ped-123",
          valoresNovos: { ativo: false },
        })
      );
    });
  });

  describe("observarPedidosVendas e observarClientes", () => {
    it("deve registrar listener em tempo real para pedidos de vendas e retornar unsubscribe", () => {
      const cb = vi.fn();
      const unsub = observarPedidosVendas(cb);
      expect(typeof unsub).toBe("function");
    });

    it("deve registrar listener em tempo real para clientes e retornar unsubscribe", () => {
      const cb = vi.fn();
      const unsub = observarClientes(cb);
      expect(typeof unsub).toBe("function");
    });
  });
});
