import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  criarLote,
  listarLotesAtivos,
  observarLotesAtivos,
  criarSaida,
  listarSaidasAtivas,
  observarSaidasAtivas,
  excluirLoteLogico,
} from "@/lib/firebase/producao-service";

// Mock do Firebase Firestore
const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  doc: (...args: any[]) => mockDoc(...args),
  addDoc: (...args: any[]) => mockAddDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  onSnapshot: vi.fn(() => vi.fn()),
  serverTimestamp: () => new Date("2026-10-16T12:00:00Z"),
  getFirestore: vi.fn(),
}));

vi.mock("@/lib/firebase/client", () => ({
  db: {},
}));

describe("Serviço Firestore de Produção e Auditoria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: "mock-doc-id" });
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  describe("criarLote", () => {
    it("deve cadastrar lote ativo no Firestore e registrar log de auditoria", async () => {
      const loteData = {
        data: new Date("2026-10-16"),
        modeloId: "argola-19mm",
        quantidadeProduzida: 5000,
        perdas: 150,
        custoMaterialCentavos: 50000,
        custoUnitarioCentavos: 10,
        observacoes: "Primeira fornada",
        responsavelId: "user-123",
      };

      const id = await criarLote(loteData, "user-123", "Carlos Produção");
      expect(id).toBe("mock-doc-id");

      // Deve ter gravado o lote
      expect(mockAddDoc).toHaveBeenCalledTimes(2); // 1 lote + 1 log de auditoria
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "lotes_producao");
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "logs_auditoria");
    });

    it("deve calcular automaticamente o custoUnitarioCentavos se custoMaterialCentavos for fornecido", async () => {
      const loteData = {
        data: new Date("2026-10-16"),
        modeloId: "argola-19mm",
        quantidadeProduzida: 1000,
        perdas: 100, // 900 boas
        custoMaterialCentavos: 9000, // R$ 90,00 -> 9000 / 900 = 10 centavos
        responsavelId: "user-123",
      };

      await criarLote(loteData, "user-123", "Carlos Produção");

      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          custoUnitarioCentavos: 10,
        })
      );
    });

    it("deve rejeitar e lançar erro se os dados do lote forem inválidos", async () => {
      const loteInvalido = {
        data: new Date("2026-10-16"),
        modeloId: "argola-inexistente",
        quantidadeProduzida: 1000,
        perdas: 10,
        responsavelId: "user-123",
      };

      await expect(
        criarLote(loteInvalido, "user-123", "Carlos Produção")
      ).rejects.toThrow("Modelo de argola não encontrado");
    });
  });

  describe("listarLotesAtivos", () => {
    it("deve consultar apenas lotes com ativo == true", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "lote-1",
            data: () => ({
              data: { toDate: () => new Date("2026-10-16") },
              modeloId: "argola-19mm",
              quantidadeProduzida: 5000,
              perdas: 100,
              ativo: true,
              criadoEm: { toDate: () => new Date("2026-10-16") },
              atualizadoEm: { toDate: () => new Date("2026-10-16") },
            }),
          },
        ],
      });

      const lotes = await listarLotesAtivos();
      expect(lotes).toHaveLength(1);
      expect(lotes[0].id).toBe("lote-1");
      expect(mockWhere).toHaveBeenCalledWith("ativo", "==", true);
    });
  });

  describe("criarSaida", () => {
    it("deve cadastrar saída na van e registrar log de auditoria", async () => {
      const saidaData = {
        loteId: "lote-1",
        modeloId: "argola-19mm",
        quantidade: 1500,
        transporte: "van_propria" as const,
        responsavelId: "user-123",
      };

      const id = await criarSaida(
        saidaData,
        3000, // saldo disponível
        "user-123",
        "Carlos Produção"
      );

      expect(id).toBe("mock-doc-id");
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "saidas_producao");
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "logs_auditoria");
    });

    it("deve rejeitar saída caso quantidade supere o saldo disponível", async () => {
      const saidaData = {
        loteId: "lote-1",
        modeloId: "argola-19mm",
        quantidade: 4000,
        transporte: "van_propria" as const,
        responsavelId: "user-123",
      };

      await expect(
        criarSaida(saidaData, 2000, "user-123", "Carlos Produção")
      ).rejects.toThrow("Quantidade informada é maior do que o saldo disponível");
    });
  });

  describe("listarSaidasAtivas", () => {
    it("deve consultar apenas saídas com ativo == true", async () => {
      mockGetDocs.mockResolvedValueOnce({
        docs: [
          {
            id: "saida-1",
            data: () => ({
              loteId: "lote-1",
              modeloId: "argola-19mm",
              quantidade: 1000,
              transporte: "van_propria",
              data: { toDate: () => new Date("2026-10-16") },
              ativo: true,
            }),
          },
        ],
      });

      const saidas = await listarSaidasAtivas();
      expect(saidas).toHaveLength(1);
      expect(saidas[0].id).toBe("saida-1");
      expect(mockWhere).toHaveBeenCalledWith("ativo", "==", true);
    });
  });

  describe("observarLotesAtivos e observarSaidasAtivas", () => {
    it("deve registrar listener em tempo real para lotes e retornar funcao unsubscribe", () => {
      const callback = vi.fn();
      const unsub = observarLotesAtivos(callback);
      expect(typeof unsub).toBe("function");
    });

    it("deve registrar listener em tempo real para saídas e retornar funcao unsubscribe", () => {
      const callback = vi.fn();
      const unsub = observarSaidasAtivas(callback);
      expect(typeof unsub).toBe("function");
    });
  });

  describe("excluirLoteLogico", () => {
    it("deve atualizar ativo para false e NUNCA excluir fisicamente", async () => {
      mockDoc.mockReturnValue("doc-ref-lote-1");

      await excluirLoteLogico(
        "lote-1",
        "Erro de digitação no operador",
        "user-123",
        "Carlos Produção"
      );

      expect(mockUpdateDoc).toHaveBeenCalledWith("doc-ref-lote-1", {
        ativo: false,
        atualizadoEm: expect.anything(),
      });

      // Auditoria com o motivo registrado
      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), "logs_auditoria");
      expect(mockAddDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          acao: "EXCLUIR_LOGICO",
          tabela: "lotes_producao",
          registroId: "lote-1",
        })
      );
    });
  });
});
