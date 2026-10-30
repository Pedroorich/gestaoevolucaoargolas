import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import { LoteProducao, SaidaProducao, LogAuditoria, DestinoSaida, StatusBanho, TipoEnvio } from "@/types/domain";
import { validarNovoLote, validarNovaSaida } from "@/lib/producao/estoque";
import { calculateUnitCost } from "@/lib/money";
import {
  salvarNoLocalStorage,
  buscarDoLocalStorage,
  atualizarNoLocalStorage,
  salvarColecaoCompletaNoLocalStorage,
} from "@/lib/storage/offline-fallback";
import { sanitizeTextInput } from "@/lib/auth/security";

/**
 * Registra uma entrada imutável no log de auditoria do sistema.
 */
export async function registrarLogAuditoria(
  log: Omit<LogAuditoria, "id" | "data">
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "logs_auditoria"), {
      ...log,
      data: serverTimestamp(),
    });
    return ref.id;
  } catch (err: any) {
    console.warn("Aviso Firestore ao registrar auditoria:", err.message);
    const localId = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    salvarNoLocalStorage("logs_auditoria", {
      ...log,
      id: localId,
      data: new Date(),
    });
    return localId;
  }
}

/**
 * Cadastra um novo lote de produção no Firestore (com fallback local resiliente).
 */
export async function criarLote(
  loteData: {
    data: Date;
    modeloId: string;
    quantidadeProduzida?: number;
    pesoKg?: number | null;
    perdas: number;
    custoMaterialCentavos?: number;
    custoUnitarioCentavos?: number;
    observacoes?: string;
    responsavelId: string;
  },
  usuarioId: string,
  usuarioNome: string
): Promise<string> {
  const validacao = validarNovoLote({
    modeloId: loteData.modeloId,
    quantidadeProduzida: loteData.quantidadeProduzida,
    pesoKg: loteData.pesoKg,
    perdas: loteData.perdas,
  });

  if (!validacao.valido) {
    throw new Error(validacao.erro || "Dados inválidos para o lote");
  }

  const quantidadeFinal = validacao.quantidadeProduzidaFinal || loteData.quantidadeProduzida || 0;
  const pesoKgFinal = validacao.pesoKgFinal ?? loteData.pesoKg ?? null;

  const unidadesBoas = quantidadeFinal - loteData.perdas;
  const custoUnitarioCalculado =
    loteData.custoUnitarioCentavos !== undefined
      ? loteData.custoUnitarioCentavos
      : loteData.custoMaterialCentavos !== undefined
      ? calculateUnitCost(loteData.custoMaterialCentavos, unidadesBoas)
      : null;

  const dadosParaSalvar = {
    ...loteData,
    quantidadeProduzida: quantidadeFinal,
    pesoKg: pesoKgFinal,
    custoUnitarioCentavos: custoUnitarioCalculado ?? null,
    responsavelId: sanitizeTextInput(loteData.responsavelId, 100),
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  let docId = `lote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const docRef = await addDoc(collection(db, "lotes_producao"), dadosParaSalvar);
    docId = docRef.id;

    // Log de auditoria obrigatório
    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "CRIAR",
      tabela: "lotes_producao",
      registroId: docRef.id,
      valoresNovos: dadosParaSalvar,
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao salvar lote na nuvem:", err.message);
  }

  // Persistência local imediata para o navegador
  salvarNoLocalStorage("lotes_producao", {
    ...dadosParaSalvar,
    id: docId,
    data: loteData.data,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

  return docId;
}

/**
 * Converte um snapshot de documento Firestore para a interface LoteProducao com tratamento seguro de datas.
 */
export function converterLoteDoc(docSnap: any): LoteProducao {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    data: data.data?.toDate
      ? data.data.toDate()
      : data.data
      ? new Date(data.data)
      : new Date(),
    modeloId: data.modeloId,
    quantidadeProduzida: data.quantidadeProduzida,
    pesoKg: data.pesoKg ?? null,
    perdas: data.perdas || 0,
    custoMaterialCentavos: data.custoMaterialCentavos,
    custoUnitarioCentavos: data.custoUnitarioCentavos,
    observacoes: data.observacoes || "",
    responsavelId: data.responsavelId,
    ativo: data.ativo !== false,
    criadoEm: data.criadoEm?.toDate
      ? data.criadoEm.toDate()
      : data.criadoEm
      ? new Date(data.criadoEm)
      : new Date(),
    atualizadoEm: data.atualizadoEm?.toDate
      ? data.atualizadoEm.toDate()
      : data.atualizadoEm
      ? new Date(data.atualizadoEm)
      : new Date(),
  } as LoteProducao;
}

/**
 * Escuta alterações de lotes ativos em tempo real (multi-dispositivos).
 * Sempre que qualquer aparelho registrar, editar ou excluir um lote,
 * todos os dispositivos conectados recebem a atualização instantaneamente.
 */
export function observarLotesAtivos(
  callback: (lotes: LoteProducao[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const q = query(collection(db, "lotes_producao"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lotes = snapshot.docs.map(converterLoteDoc);
        lotes.sort((a, b) => b.data.getTime() - a.data.getTime());
        salvarColecaoCompletaNoLocalStorage("lotes_producao", lotes);
        callback(lotes);
      },
      (error) => {
        console.warn("Aviso onSnapshot lotes_producao:", error?.message || error);
        if (onError) onError(error);
        listarLotesAtivos().then(callback);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn("Falha ao inicializar listener de lotes:", err?.message || err);
    listarLotesAtivos().then(callback);
    return () => {};
  }
}

/**
 * Retorna todos os lotes ativos do sistema ordenados do mais recente para o mais antigo.
 */
export async function listarLotesAtivos(): Promise<LoteProducao[]> {
  try {
    const q = query(collection(db, "lotes_producao"), where("ativo", "==", true));
    const snapshot = await getDocs(q);

    const lotesNuvem = snapshot.docs.map(converterLoteDoc);
    lotesNuvem.sort((a, b) => b.data.getTime() - a.data.getTime());
    salvarColecaoCompletaNoLocalStorage("lotes_producao", lotesNuvem);
    return lotesNuvem;
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar lotes:", err.message);
  }

  const lotesLocais = buscarDoLocalStorage<any>("lotes_producao")
    .filter((l) => l.ativo !== false)
    .map((l) => ({
      ...l,
      data: new Date(l.data),
      criadoEm: new Date(l.criadoEm),
      atualizadoEm: new Date(l.atualizadoEm),
    }));

  return lotesLocais.sort((a, b) => b.data.getTime() - a.data.getTime());
}

/**
 * Registra saída de argolas para logística / van.
 */
export async function criarSaida(
  saidaData: {
    loteId: string;
    modeloId: string;
    quantidade: number;
    transporte: TipoEnvio;
    destino?: DestinoSaida;
    responsavelId: string;
  },
  saldoDisponivel: number,
  usuarioId: string,
  usuarioNome: string
): Promise<string> {
  const validacao = validarNovaSaida({
    loteId: saidaData.loteId,
    quantidade: saidaData.quantidade,
    saldoDisponivel,
  });

  if (!validacao.valido) {
    throw new Error(validacao.erro || "Dados inválidos para a saída");
  }

  const destino: DestinoSaida = saidaData.destino || "centro_logistica";
  const statusBanho: StatusBanho = destino === "banho" ? "em_banho" : "nao_aplicavel";

  const payloadCompleto = {
    ...saidaData,
    destino,
    statusBanho,
    ativo: true,
  };

  let docId = `saida-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const docRef = await addDoc(collection(db, "saidas_producao"), {
      ...payloadCompleto,
      data: serverTimestamp(),
    });
    docId = docRef.id;

    // Log de auditoria
    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "CRIAR",
      tabela: "saidas_producao",
      registroId: docRef.id,
      valoresNovos: payloadCompleto,
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao registrar saída na nuvem:", err.message);
  }

  salvarNoLocalStorage("saidas_producao", {
    ...payloadCompleto,
    id: docId,
    data: new Date(),
  });

  return docId;
}

/**
 * Conclui o processo de banho de uma remessa de argolas, liberando-a para o Centro de Logística.
 */
export async function concluirBanhoRemessa(
  saidaId: string,
  usuarioId: string,
  usuarioNome: string
): Promise<void> {
  const dataRetorno = new Date();

  try {
    const docRef = doc(db, "saidas_producao", saidaId);
    await updateDoc(docRef, {
      statusBanho: "concluido",
      dataRetornoBanho: serverTimestamp(),
    });

    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "EDITAR",
      tabela: "saidas_producao",
      registroId: saidaId,
      valoresNovos: {
        statusBanho: "concluido",
        dataRetornoBanho: dataRetorno,
      },
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao concluir banho de remessa:", err.message);
  }

  // Atualização no localStorage
  atualizarNoLocalStorage("saidas_producao", saidaId, {
    statusBanho: "concluido",
    dataRetornoBanho: dataRetorno,
  });
}

/**
 * Converte um snapshot de documento Firestore para a interface SaidaProducao com tratamento seguro de datas.
 */
export function converterSaidaDoc(docSnap: any): SaidaProducao {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    loteId: data.loteId,
    modeloId: data.modeloId,
    quantidade: data.quantidade,
    transporte: data.transporte,
    destino: (data.destino as DestinoSaida) || "centro_logistica",
    statusBanho: (data.statusBanho as StatusBanho) || "nao_aplicavel",
    dataRetornoBanho: data.dataRetornoBanho?.toDate
      ? data.dataRetornoBanho.toDate()
      : data.dataRetornoBanho
      ? new Date(data.dataRetornoBanho)
      : null,
    data: data.data?.toDate
      ? data.data.toDate()
      : data.data
      ? new Date(data.data)
      : new Date(),
    responsavelId: data.responsavelId,
    ativo: data.ativo !== false,
  } as SaidaProducao;
}

/**
 * Escuta alterações de saídas de produção em tempo real (multi-dispositivos).
 * Sempre que qualquer aparelho lançar uma saída ou concluir banho, todos os dispositivos conectados
 * atualizam imediatamente o estoque de remessas e o saldo dos lotes.
 */
export function observarSaidasAtivas(
  callback: (saidas: SaidaProducao[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const q = query(collection(db, "saidas_producao"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const saidas = snapshot.docs.map(converterSaidaDoc);
        salvarColecaoCompletaNoLocalStorage("saidas_producao", saidas);
        callback(saidas);
      },
      (error) => {
        console.warn("Aviso onSnapshot saidas_producao:", error?.message || error);
        if (onError) onError(error);
        listarSaidasAtivas().then(callback);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn("Falha ao inicializar listener de saídas:", err?.message || err);
    listarSaidasAtivas().then(callback);
    return () => {};
  }
}

/**
 * Retorna todas as saídas de produção ativas.
 */
export async function listarSaidasAtivas(): Promise<SaidaProducao[]> {
  try {
    const q = query(collection(db, "saidas_producao"), where("ativo", "==", true));
    const snapshot = await getDocs(q);

    const saidasNuvem = snapshot.docs.map(converterSaidaDoc);
    salvarColecaoCompletaNoLocalStorage("saidas_producao", saidasNuvem);
    return saidasNuvem;
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar saídas:", err.message);
  }

  const saidasLocais = buscarDoLocalStorage<any>("saidas_producao")
    .filter((s) => s.ativo !== false)
    .map((s) => ({
      ...s,
      destino: s.destino || "centro_logistica",
      statusBanho: s.statusBanho || "nao_aplicavel",
      dataRetornoBanho: s.dataRetornoBanho ? new Date(s.dataRetornoBanho) : null,
      data: new Date(s.data),
    }));

  return saidasLocais;
}

/**
 * Realiza a exclusão lógica de um lote de produção.
 * NUNCA apaga fisicamente o documento.
 */
export async function excluirLoteLogico(
  loteId: string,
  motivo: string,
  usuarioId: string,
  usuarioNome: string
): Promise<void> {
  try {
    const docRef = doc(db, "lotes_producao", loteId);

    await updateDoc(docRef, {
      ativo: false,
      atualizadoEm: serverTimestamp(),
    });

    const motivoSanitizado = sanitizeTextInput(motivo, 300);

    // Log de auditoria registrando o motivo
    await registrarLogAuditoria({
      usuarioId: sanitizeTextInput(usuarioId, 100),
      usuarioNome: sanitizeTextInput(usuarioNome, 150),
      acao: "EXCLUIR_LOGICO",
      tabela: "lotes_producao",
      registroId: loteId,
      valoresNovos: {
        ativo: false,
        motivo: motivoSanitizado,
      },
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao excluir lote:", err.message);
  }

  atualizarNoLocalStorage("lotes_producao", loteId, { ativo: false });
}
