import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import {
  PedidoVenda,
  SituacaoPedido,
  TipoEnvio,
  ItemPedidoVenda,
  Cliente,
} from "@/types/domain";
import { registrarLogAuditoria } from "./producao-service";
import {
  calcularTotaisPedido,
  validarPedidoCompleto,
} from "@/lib/vendas/vendas-engine";
import {
  salvarNoLocalStorage,
  buscarDoLocalStorage,
  atualizarNoLocalStorage,
  salvarColecaoCompletaNoLocalStorage,
} from "@/lib/storage/offline-fallback";
import { sanitizeTextInput } from "@/lib/auth/security";

export interface NovoPedidoInput {
  clienteId: string;
  clienteNome: string;
  enderecoEntrega?: string;
  data?: Date;
  tipoEnvio: TipoEnvio;
  custoFreteCentavos: number;
  custoEmbalagemCentavos?: number;
  custoCombustivelCentavos?: number;
  itens: Array<{
    modeloId: string;
    saidaId: string;
    loteId?: string;
    tipoUnidade: "unidades" | "kg";
    quantidade: number;
    quantidadeUnidades: number;
    pesoKg?: number | null;
    precoCentavos: number;
    custoMateriaPrimaCentavos?: number;
  }>;
  situacao?: SituacaoPedido;
  observacoes?: string;
  responsavelId: string;
}

/**
 * Cadastra um novo pedido de venda e despacha log de auditoria imutável.
 */
export async function criarPedidoVenda(
  pedidoInput: NovoPedidoInput,
  usuarioId: string,
  usuarioNome: string
): Promise<string> {
  // Valida campos essenciais do pedido
  if (!pedidoInput.clienteId || pedidoInput.clienteId.trim() === "") {
    throw new Error("Selecione um cliente para a venda");
  }

  if (!pedidoInput.itens || pedidoInput.itens.length === 0) {
    throw new Error("O pedido deve conter pelo menos um item");
  }

  // Calcula totais em centavos inteiros
  const { totalItensCentavos, totalGeralCentavos, totalUnidades } =
    calcularTotaisPedido(
      pedidoInput.itens.map((i) => ({
        quantidadeUnidades: i.quantidadeUnidades,
        precoCentavos: i.precoCentavos,
      })),
      pedidoInput.custoFreteCentavos
    );

  // Valida cada item individualmente
  for (let i = 0; i < pedidoInput.itens.length; i++) {
    const item = pedidoInput.itens[i];
    if (!item.modeloId || !item.saidaId) {
      throw new Error(`Item ${i + 1}: modelo ou remessa de saída não selecionada`);
    }
    if (item.quantidadeUnidades <= 0 || item.precoCentavos <= 0) {
      throw new Error(`Item ${i + 1}: quantidade ou valor monetário inválido`);
    }
  }

  let proximoNumero = 1001;

  // Calcula próximo número sequencial de pedido (base 1001)
  try {
    const qUltimoPedido = query(
      collection(db, "pedidos_vendas"),
      orderBy("numeroPedido", "desc"),
      limit(1)
    );
    const snapshotUltimo = await getDocs(qUltimoPedido);
    let maxNumero = 1000;
    if (snapshotUltimo.docs && snapshotUltimo.docs.length > 0) {
      const data = snapshotUltimo.docs[0].data();
      if (typeof data.numeroPedido === "number") {
        maxNumero = data.numeroPedido;
      }
    }
    proximoNumero = maxNumero + 1;
  } catch (err: any) {
    // Fallback: calcula via localStorage se Firestore recusar
    const locais = buscarDoLocalStorage<PedidoVenda>("pedidos_vendas");
    const maxLocal = locais.reduce((max, p) => Math.max(max, p.numeroPedido || 1000), 1000);
    proximoNumero = maxLocal + 1;
  }

  const dadosParaSalvar = {
    numeroPedido: proximoNumero,
    clienteId: sanitizeTextInput(pedidoInput.clienteId, 100),
    clienteNome: sanitizeTextInput(pedidoInput.clienteNome, 150),
    enderecoEntrega: sanitizeTextInput(pedidoInput.enderecoEntrega, 250),
    data: pedidoInput.data || serverTimestamp(),
    tipoEnvio: pedidoInput.tipoEnvio,
    custoFreteCentavos: Math.max(0, Math.floor(pedidoInput.custoFreteCentavos || 0)),
    custoEmbalagemCentavos: Math.max(0, Math.floor(pedidoInput.custoEmbalagemCentavos || 0)),
    custoCombustivelCentavos: Math.max(0, Math.floor(pedidoInput.custoCombustivelCentavos || 0)),
    itens: pedidoInput.itens,
    totalItensCentavos: Math.max(0, Math.floor(totalItensCentavos)),
    totalPedidoCentavos: Math.max(0, Math.floor(totalGeralCentavos)),
    totalUnidades: Math.max(0, Math.floor(totalUnidades)),
    situacao: pedidoInput.situacao || ("pendente" as SituacaoPedido),
    observacoes: sanitizeTextInput(pedidoInput.observacoes, 500),
    responsavelId: sanitizeTextInput(pedidoInput.responsavelId, 100),
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  let docId = `ped-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const docRef = await addDoc(
      collection(db, "pedidos_vendas"),
      dadosParaSalvar
    );
    docId = docRef.id;

    // Log de auditoria obrigatório
    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "CRIAR",
      tabela: "pedidos_vendas",
      registroId: docRef.id,
      valoresNovos: dadosParaSalvar,
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao criar pedido:", err.message);
  }

  // Persistência local imediata
  salvarNoLocalStorage("pedidos_vendas", {
    ...dadosParaSalvar,
    id: docId,
    data: pedidoInput.data || new Date(),
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });

  return docId;
}

/**
 * Converte um snapshot de documento Firestore para a interface PedidoVenda.
 */
export function converterPedidoDoc(docSnap: any): PedidoVenda {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    numeroPedido: data.numeroPedido,
    clienteId: data.clienteId,
    clienteNome: data.clienteNome,
    enderecoEntrega: data.enderecoEntrega || "",
    data: data.data?.toDate ? data.data.toDate() : data.data ? new Date(data.data) : new Date(),
    tipoEnvio: data.tipoEnvio,
    custoFreteCentavos: data.custoFreteCentavos,
    custoEmbalagemCentavos: data.custoEmbalagemCentavos || 0,
    custoCombustivelCentavos: data.custoCombustivelCentavos || 0,
    itens: data.itens || [],
    totalItensCentavos: data.totalItensCentavos,
    totalPedidoCentavos: data.totalPedidoCentavos,
    totalUnidades: data.totalUnidades,
    situacao: data.situacao,
    observacoes: data.observacoes,
    responsavelId: data.responsavelId,
    ativo: data.ativo !== false,
    criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : data.criadoEm ? new Date(data.criadoEm) : new Date(),
    atualizadoEm: data.atualizadoEm?.toDate
      ? data.atualizadoEm.toDate()
      : data.atualizadoEm ? new Date(data.atualizadoEm) : new Date(),
  } as PedidoVenda;
}

/**
 * Escuta pedidos de venda em tempo real (multi-dispositivos).
 * Sempre que um pedido for criado ou tiver sua situação alterada em qualquer dispositivo,
 * a atualização é refletida instantaneamente para todos os usuários logados.
 */
export function observarPedidosVendas(
  callback: (pedidos: PedidoVenda[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const q = query(
      collection(db, "pedidos_vendas"),
      where("ativo", "==", true)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const pedidos = snapshot.docs.map(converterPedidoDoc);
        pedidos.sort((a, b) => {
          const dateA = a.data instanceof Date ? a.data.getTime() : 0;
          const dateB = b.data instanceof Date ? b.data.getTime() : 0;
          return dateB - dateA;
        });
        salvarColecaoCompletaNoLocalStorage("pedidos_vendas", pedidos);
        callback(pedidos);
      },
      (error) => {
        console.warn("Aviso onSnapshot pedidos_vendas:", error?.message || error);
        if (onError) onError(error);
        listarPedidosVendas().then(callback);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn("Falha ao inicializar listener de pedidos:", err?.message || err);
    listarPedidosVendas().then(callback);
    return () => {};
  }
}

/**
 * Retorna todos os pedidos de venda ativos do sistema.
 */
export async function listarPedidosVendas(): Promise<PedidoVenda[]> {
  try {
    const q = query(
      collection(db, "pedidos_vendas"),
      where("ativo", "==", true)
    );
    const snapshot = await getDocs(q);

    const pedidosNuvem = snapshot.docs.map(converterPedidoDoc);
    pedidosNuvem.sort((a, b) => {
      const dateA = a.data instanceof Date ? a.data.getTime() : 0;
      const dateB = b.data instanceof Date ? b.data.getTime() : 0;
      return dateB - dateA;
    });
    salvarColecaoCompletaNoLocalStorage("pedidos_vendas", pedidosNuvem);
    return pedidosNuvem;
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar pedidos:", err.message);
  }

  const pedidosLocais = buscarDoLocalStorage<any>("pedidos_vendas")
    .filter((p) => p.ativo !== false)
    .map((p) => ({
      ...p,
      enderecoEntrega: p.enderecoEntrega || "",
      data: new Date(p.data),
      criadoEm: new Date(p.criadoEm),
      atualizadoEm: new Date(p.atualizadoEm),
    }));

  return pedidosLocais.sort((a, b) => {
    const dateA = a.data instanceof Date ? a.data.getTime() : 0;
    const dateB = b.data instanceof Date ? b.data.getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Atualiza o status/situação de um pedido de venda.
 */
export async function atualizarSituacaoPedido(
  pedidoId: string,
  novaSituacao: SituacaoPedido,
  usuarioId: string,
  usuarioNome: string
): Promise<void> {
  try {
    const pedidoRef = doc(db, "pedidos_vendas", pedidoId);
    await updateDoc(pedidoRef, {
      situacao: novaSituacao,
      atualizadoEm: serverTimestamp(),
    });

    // Se entregue, atualiza métricas do cliente (totalCompras, dataUltimaCompra, cliente_fiel)
    if (novaSituacao === "entregue") {
      try {
        const pedidoSnap = await getDoc(pedidoRef);
        if (pedidoSnap && typeof pedidoSnap.data === "function") {
          const dadosPedido = pedidoSnap.data();
          if (dadosPedido && dadosPedido.clienteId) {
            const clienteRef = doc(db, "clientes", dadosPedido.clienteId);
            const clienteSnap = await getDoc(clienteRef);
            if (clienteSnap && typeof clienteSnap.data === "function") {
              const clienteData = clienteSnap.data();
              const totalComprasAtual = (clienteData?.totalCompras || 0) + 1;
              const novaClassificacao =
                totalComprasAtual >= 3 ? "cliente_fiel" : (clienteData?.situacao || "ja_comprou");
              await updateDoc(clienteRef, {
                totalCompras: totalComprasAtual,
                dataUltimaCompra: serverTimestamp(),
                situacao: novaClassificacao,
                atualizadoEm: serverTimestamp(),
              });
            }
          }
        }
      } catch {
        // Ignora erro em cache offline
      }
    }

    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "EDITAR",
      tabela: "pedidos_vendas",
      registroId: pedidoId,
      valoresNovos: { situacao: novaSituacao },
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao atualizar situação:", err.message);
  }

  atualizarNoLocalStorage("pedidos_vendas", pedidoId, {
    situacao: novaSituacao,
    atualizadoEm: new Date(),
  });
}

/**
 * Realiza exclusão lógica de um pedido de venda.
 */
export async function excluirPedidoLogico(
  pedidoId: string,
  usuarioId: string,
  usuarioNome: string
): Promise<void> {
  try {
    const pedidoRef = doc(db, "pedidos_vendas", pedidoId);
    await updateDoc(pedidoRef, {
      ativo: false,
      atualizadoEm: serverTimestamp(),
    });

    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "EXCLUIR_LOGICO",
      tabela: "pedidos_vendas",
      registroId: pedidoId,
      valoresNovos: { ativo: false },
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao excluir pedido:", err.message);
  }

  atualizarNoLocalStorage("pedidos_vendas", pedidoId, { ativo: false });
}

/**
 * Cadastra um cliente rapidamente direto da tela de novo pedido.
 */
export async function cadastrarClienteRapido(
  dados: {
    nome: string;
    telefone: string;
    cidade: string;
    endereco?: string;
    cep?: string;
    email?: string;
    origemContato?: string;
  },
  usuarioId: string,
  usuarioNome: string
): Promise<string> {
  if (!dados.nome || dados.nome.trim() === "") {
    throw new Error("Nome do cliente é obrigatório");
  }

  const clienteData = {
    nome: sanitizeTextInput(dados.nome, 150),
    telefone: sanitizeTextInput(dados.telefone, 30),
    cidade: sanitizeTextInput(dados.cidade, 100) || "São Paulo",
    endereco: sanitizeTextInput(dados.endereco, 250),
    cep: sanitizeTextInput(dados.cep, 20),
    email: dados.email ? sanitizeTextInput(dados.email, 120).toLowerCase() : "",
    origemContato: sanitizeTextInput(dados.origemContato, 50) || "direto",
    totalCompras: 0,
    dataUltimaCompra: null,
    situacao: "prospeccao",
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  let docId = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const docRef = await addDoc(collection(db, "clientes"), clienteData);
    docId = docRef.id;

    await registrarLogAuditoria({
      usuarioId,
      usuarioNome,
      acao: "CRIAR",
      tabela: "clientes",
      registroId: docRef.id,
      valoresNovos: clienteData,
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao cadastrar cliente:", err.message);
  }

  salvarNoLocalStorage("clientes", {
    ...clienteData,
    id: docId,
  });

  return docId;
}

/**
 * Converte um snapshot de documento Firestore para a interface Cliente.
 */
export function converterClienteDoc(docSnap: any): Cliente {
  const data = docSnap.data();
  const totalCompras = data.totalCompras || 0;
  return {
    id: docSnap.id,
    nome: data.nome,
    telefone: data.telefone || "",
    email: data.email || "",
    cidade: data.cidade || "São Paulo",
    endereco: data.endereco || "",
    cep: data.cep || "",
    origemContato: data.origemContato || "direto",
    totalCompras,
    dataUltimaCompra: data.dataUltimaCompra?.toDate
      ? data.dataUltimaCompra.toDate()
      : data.dataUltimaCompra
      ? new Date(data.dataUltimaCompra)
      : null,
    situacao: (totalCompras >= 3 ? "cliente_fiel" : data.situacao || "prospeccao") as any,
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
  } as Cliente;
}

/**
 * Escuta clientes ativos em tempo real (multi-dispositivos).
 */
export function observarClientes(
  callback: (clientes: Cliente[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const q = query(collection(db, "clientes"), where("ativo", "==", true));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientes = snapshot.docs.map(converterClienteDoc);
        clientes.sort((a, b) => a.nome.localeCompare(b.nome));
        salvarColecaoCompletaNoLocalStorage("clientes", clientes);
        callback(clientes);
      },
      (error) => {
        console.warn("Aviso onSnapshot clientes:", error?.message || error);
        if (onError) onError(error);
        listarClientesCompleto().then(callback);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.warn("Falha ao inicializar listener de clientes:", err?.message || err);
    listarClientesCompleto().then(callback);
    return () => {};
  }
}

/**
 * Retorna lista resumida de clientes ativos para o seletor de pedidos.
 */
export async function listarClientesParaVenda(): Promise<
  Array<{ id: string; nome: string; cidade: string; telefone: string; endereco?: string }>
> {
  const completos = await listarClientesCompleto();
  return completos.map((c) => ({
    id: c.id,
    nome: c.nome,
    cidade: c.cidade || "",
    telefone: c.telefone || "",
    endereco: c.endereco || "",
  }));
}

/**
 * Retorna todos os dados dos clientes ativos para a tela de gestão de clientes e retenção.
 */
export async function listarClientesCompleto(): Promise<Cliente[]> {
  try {
    const q = query(collection(db, "clientes"), where("ativo", "==", true));
    const snapshot = await getDocs(q);

    const clientesNuvem = snapshot.docs.map(converterClienteDoc);
    clientesNuvem.sort((a, b) => a.nome.localeCompare(b.nome));
    salvarColecaoCompletaNoLocalStorage("clientes", clientesNuvem);
    return clientesNuvem;
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar clientes completos:", err.message);
  }

  const clientesLocais = buscarDoLocalStorage<any>("clientes")
    .filter((c) => c.ativo !== false)
    .map((c) => {
      const totalCompras = c.totalCompras || 0;
      return {
        id: c.id,
        nome: c.nome,
        telefone: c.telefone || "",
        email: c.email || "",
        cidade: c.cidade || "São Paulo",
        endereco: c.endereco || "",
        cep: c.cep || "",
        origemContato: c.origemContato || "direto",
        totalCompras,
        dataUltimaCompra: c.dataUltimaCompra ? new Date(c.dataUltimaCompra) : null,
        situacao: (totalCompras >= 3 ? "cliente_fiel" : c.situacao || "prospeccao") as any,
        ativo: c.ativo !== false,
      } as Cliente;
    });

  return clientesLocais.sort((a, b) => a.nome.localeCompare(b.nome));
}
