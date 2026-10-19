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
} from "firebase/firestore";
import { db } from "./client";
import {
  PedidoVenda,
  SituacaoPedido,
  TipoEnvio,
  ItemPedidoVenda,
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
} from "@/lib/storage/offline-fallback";

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
    clienteId: pedidoInput.clienteId.trim(),
    clienteNome: pedidoInput.clienteNome.trim(),
    enderecoEntrega: pedidoInput.enderecoEntrega?.trim() || "",
    data: pedidoInput.data || serverTimestamp(),
    tipoEnvio: pedidoInput.tipoEnvio,
    custoFreteCentavos: pedidoInput.custoFreteCentavos,
    custoEmbalagemCentavos: pedidoInput.custoEmbalagemCentavos || 0,
    custoCombustivelCentavos: pedidoInput.custoCombustivelCentavos || 0,
    itens: pedidoInput.itens,
    totalItensCentavos,
    totalPedidoCentavos: totalGeralCentavos,
    totalUnidades,
    situacao: pedidoInput.situacao || ("pendente" as SituacaoPedido),
    observacoes: pedidoInput.observacoes?.trim() || "",
    responsavelId: pedidoInput.responsavelId,
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  let docId = `ped-${Date.now()}`;

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
 * Retorna todos os pedidos de venda ativos do sistema.
 */
export async function listarPedidosVendas(): Promise<PedidoVenda[]> {
  let pedidosNuvem: PedidoVenda[] = [];

  try {
    const q = query(
      collection(db, "pedidos_vendas"),
      where("ativo", "==", true)
    );
    const snapshot = await getDocs(q);

    pedidosNuvem = snapshot.docs.map((docSnap) => {
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
        ativo: data.ativo,
        criadoEm: data.criadoEm?.toDate ? data.criadoEm.toDate() : data.criadoEm ? new Date(data.criadoEm) : new Date(),
        atualizadoEm: data.atualizadoEm?.toDate
          ? data.atualizadoEm.toDate()
          : data.atualizadoEm ? new Date(data.atualizadoEm) : new Date(),
      } as PedidoVenda;
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar pedidos:", err.message);
  }

  const pedidosLocais = buscarDoLocalStorage<any>("pedidos_vendas")
    .filter((p) => p.ativo)
    .map((p) => ({
      ...p,
      enderecoEntrega: p.enderecoEntrega || "",
      data: new Date(p.data),
      criadoEm: new Date(p.criadoEm),
      atualizadoEm: new Date(p.atualizadoEm),
    }));

  const mapPedidos = new Map<string, PedidoVenda>();
  for (const p of pedidosLocais) mapPedidos.set(p.id, p);
  for (const p of pedidosNuvem) mapPedidos.set(p.id, p);

  const todosPedidos = Array.from(mapPedidos.values());
  return todosPedidos.sort((a, b) => {
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
    nome: dados.nome.trim(),
    telefone: dados.telefone ? dados.telefone.trim() : "",
    cidade: dados.cidade ? dados.cidade.trim() : "São Paulo",
    endereco: dados.endereco ? dados.endereco.trim() : "",
    cep: dados.cep ? dados.cep.trim() : "",
    email: dados.email?.trim() || "",
    origemContato: dados.origemContato || "direto",
    totalCompras: 0,
    dataUltimaCompra: null,
    situacao: "prospeccao",
    ativo: true,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  };

  let docId = `cli-${Date.now()}`;

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
 * Retorna lista resumida de clientes ativos para o seletor de pedidos.
 */
export async function listarClientesParaVenda(): Promise<
  Array<{ id: string; nome: string; cidade: string; telefone: string; endereco?: string }>
> {
  let clientesNuvem: Array<{ id: string; nome: string; cidade: string; telefone: string; endereco?: string }> = [];

  try {
    const q = query(collection(db, "clientes"), where("ativo", "==", true));
    const snapshot = await getDocs(q);

    clientesNuvem = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        nome: data.nome,
        cidade: data.cidade || "",
        telefone: data.telefone || "",
        endereco: data.endereco || "",
      };
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar clientes:", err.message);
  }

  const clientesLocais = buscarDoLocalStorage<any>("clientes")
    .filter((c) => c.ativo)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      cidade: c.cidade || "",
      telefone: c.telefone || "",
      endereco: c.endereco || "",
    }));

  const mapClientes = new Map<string, { id: string; nome: string; cidade: string; telefone: string; endereco?: string }>();
  for (const c of clientesLocais) mapClientes.set(c.id, c);
  for (const c of clientesNuvem) mapClientes.set(c.id, c);

  return Array.from(mapClientes.values());
}

/**
 * Retorna todos os dados dos clientes ativos para a tela de gestão de clientes e retenção.
 */
export async function listarClientesCompleto(): Promise<import('@/types/domain').Cliente[]> {
  let clientesNuvem: import('@/types/domain').Cliente[] = [];

  try {
    const q = query(collection(db, "clientes"), where("ativo", "==", true));
    const snapshot = await getDocs(q);

    clientesNuvem = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const totalCompras = data.totalCompras || 0;
      return {
        id: docSnap.id,
        nome: data.nome,
        telefone: data.telefone || "",
        email: data.email || "",
        cidade: data.cidade || "",
        endereco: data.endereco || "",
        cep: data.cep || "",
        origemContato: data.origemContato || "direto",
        totalCompras,
        dataUltimaCompra: data.dataUltimaCompra?.toDate
          ? data.dataUltimaCompra.toDate()
          : data.dataUltimaCompra
          ? new Date(data.dataUltimaCompra)
          : null,
        situacao: (totalCompras >= 3 ? "cliente_fiel" : data.situacao || "prospectado") as any,
        ativo: data.ativo,
      };
    });
  } catch (err: any) {
    console.warn("Aviso Firestore ao listar clientes completos:", err.message);
  }

  const clientesLocais = buscarDoLocalStorage<any>("clientes")
    .filter((c) => c.ativo)
    .map((c) => {
      const totalCompras = c.totalCompras || 0;
      return {
        id: c.id,
        nome: c.nome,
        telefone: c.telefone || "",
        email: c.email || "",
        cidade: c.cidade || "",
        endereco: c.endereco || "",
        cep: c.cep || "",
        origemContato: c.origemContato || "direto",
        totalCompras,
        dataUltimaCompra: c.dataUltimaCompra ? new Date(c.dataUltimaCompra) : null,
        situacao: (totalCompras >= 3 ? "cliente_fiel" : c.situacao || "prospectado") as any,
        ativo: c.ativo,
      };
    });

  const mapClientesCompleto = new Map<string, import('@/types/domain').Cliente>();
  for (const c of clientesLocais) mapClientesCompleto.set(c.id, c);
  for (const c of clientesNuvem) mapClientesCompleto.set(c.id, c);

  return Array.from(mapClientesCompleto.values());
}
