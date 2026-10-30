/**
 * Suporte a persistência local resiliente no navegador (LocalStorage)
 * Garante que qualquer inserção ou edição seja salva e exibida imediatamente,
 * mesmo se o Firestore recusar permissões na nuvem ou o dispositivo estiver sem internet.
 */

export function salvarNoLocalStorage<T extends { id: string }>(
  colecao: string,
  item: T
): void {
  if (typeof window === "undefined") return;
  try {
    const chave = `evolucao_${colecao}`;
    const raw = localStorage.getItem(chave);
    const lista: T[] = raw ? JSON.parse(raw) : [];
    const index = lista.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      lista[index] = { ...lista[index], ...item };
    } else {
      lista.unshift(item);
    }
    localStorage.setItem(chave, JSON.stringify(lista));
  } catch (err) {
    console.warn(`Erro ao salvar no localStorage (${colecao}):`, err);
  }
}

export function buscarDoLocalStorage<T>(colecao: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const chave = `evolucao_${colecao}`;
    const raw = localStorage.getItem(chave);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn(`Erro ao buscar do localStorage (${colecao}):`, err);
    return [];
  }
}

export function atualizarNoLocalStorage<T extends Record<string, any> = Record<string, any>>(
  colecao: string,
  id: string,
  camposAtualizados: Partial<T>
): void {
  if (typeof window === "undefined") return;
  try {
    const chave = `evolucao_${colecao}`;
    const raw = localStorage.getItem(chave);
    if (!raw) return;
    const lista: any[] = JSON.parse(raw);
    const index = lista.findIndex((i) => i.id === id);
    if (index >= 0) {
      lista[index] = { ...lista[index], ...camposAtualizados };
      localStorage.setItem(chave, JSON.stringify(lista));
    }
  } catch (err) {
    console.warn(`Erro ao atualizar no localStorage (${colecao}):`, err);
  }
}

export function salvarColecaoCompletaNoLocalStorage<T>(
  colecao: string,
  itens: T[]
): void {
  if (typeof window === "undefined") return;
  try {
    const chave = `evolucao_${colecao}`;
    localStorage.setItem(chave, JSON.stringify(itens));
  } catch (err) {
    console.warn(`Erro ao sincronizar colecao completa no localStorage (${colecao}):`, err);
  }
}

/**
 * Limpa todos os dados operacionais de teste armazenados localmente no navegador,
 * preservando estritamente as contas de usuário e a sessão de login.
 */
export function limparDadosLocaisExcetoLogin(): void {
  if (typeof window === "undefined") return;
  try {
    const chavesParaRemover = [
      "evolucao_lotes_producao",
      "evolucao_saidas_producao",
      "evolucao_pedidos_vendas",
      "evolucao_clientes",
      "evolucao_logs_auditoria",
      "evolucao_despesas_logistica",
      "evolucao_materias_primas",
    ];
    chavesParaRemover.forEach((chave) => localStorage.removeItem(chave));
  } catch (err) {
    console.warn("Erro ao limpar dados locais:", err);
  }
}


