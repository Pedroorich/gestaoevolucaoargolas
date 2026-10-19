/**
 * Serviço de Gerenciamento de Usuários e Aprovações de Acesso
 * Sistema de Gestão — Evolução Argolas
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './client';
import { PerfilUsuario, Usuario, StatusUsuario } from '@/types/domain';
import {
  isAdminMasterEmail,
  sanitizeEmail,
  sanitizeName,
  ADMIN_MASTER_EMAIL,
} from '@/lib/auth/security';
import {
  salvarNoLocalStorage,
  buscarDoLocalStorage,
  atualizarNoLocalStorage,
} from '@/lib/storage/offline-fallback';

export interface CriarUsuarioParams {
  uid: string;
  email: string;
  nome: string;
  perfilDesejado?: PerfilUsuario;
}

/**
 * Constrói o objeto de dados inicial do usuário com regras de negócio e segurança.
 * O e-mail ph44608@gmail.com é auto-aprovado como Administrador Geral (gestao + isAdminMaster).
 * Todos os demais iniciam como status 'pendente' e aprovado = false.
 */
export function buildInitialUserData(params: CriarUsuarioParams): Usuario {
  const cleanEmail = sanitizeEmail(params.email);
  const cleanName = sanitizeName(params.nome);
  const isMaster = isAdminMasterEmail(cleanEmail);

  const now = new Date().toISOString();

  if (isMaster) {
    return {
      id: params.uid,
      nome: cleanName,
      email: ADMIN_MASTER_EMAIL,
      perfil: 'gestao',
      status: 'aprovado',
      aprovado: true,
      isAdminMaster: true,
      ativo: true,
      criadoEm: now,
      aprovadoPor: 'sistema-auto',
      aprovadoEm: now,
      doisFatoresAtivo: false,
    };
  }

  return {
    id: params.uid,
    nome: cleanName,
    email: cleanEmail,
    perfil: params.perfilDesejado || 'producao',
    status: 'pendente',
    aprovado: false,
    isAdminMaster: false,
    ativo: true,
    criadoEm: now,
    aprovadoPor: null,
    aprovadoEm: null,
    doisFatoresAtivo: false,
  };
}

/**
 * Salva o perfil do usuário no Firestore com fallback resiliente para armazenamento local.
 */
export async function salvarPerfilUsuario(userData: Usuario): Promise<void> {
  try {
    const userDocRef = doc(db, 'usuarios', userData.id);
    await setDoc(userDocRef, userData, { merge: true });
  } catch (err: any) {
    console.warn('Aviso Firestore ao salvar perfil de usuário:', err?.message || err);
  } finally {
    salvarNoLocalStorage('usuarios', userData);
  }
}

/**
 * Busca o perfil de um usuário pelo seu UID.
 */
export async function buscarUsuarioPorId(uid: string): Promise<Usuario | null> {
  try {
    const userDocRef = doc(db, 'usuarios', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as Usuario;
    }
  } catch (err: any) {
    console.warn('Aviso Firestore ao buscar perfil por ID:', err?.message || err);
  }

  const localList = buscarDoLocalStorage<Usuario>('usuarios');
  const found = localList.find((u) => u.id === uid);
  return found || null;
}

/**
 * Lista todos os usuários cadastrados no sistema (para uso do Admin Geral).
 */
export async function listarUsuarios(): Promise<Usuario[]> {
  try {
    const usersCol = collection(db, 'usuarios');
    const q = query(usersCol, orderBy('criadoEm', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as Usuario);
      return items;
    }
  } catch (err: any) {
    console.warn('Aviso Firestore ao listar usuários:', err?.message || err);
  }

  return buscarDoLocalStorage<Usuario>('usuarios');
}

/**
 * Aprova o cadastro de um usuário, definindo seu perfil final de acesso e carimbo de aprovação.
 */
export async function aprovarUsuario(
  uid: string,
  perfil: PerfilUsuario,
  aprovadorEmail: string
): Promise<Usuario> {
  const agora = new Date().toISOString();
  const alteracoes: Partial<Usuario> = {
    status: 'aprovado',
    aprovado: true,
    perfil,
    aprovadoPor: aprovadorEmail,
    aprovadoEm: agora,
    ativo: true,
  };

  try {
    const userDocRef = doc(db, 'usuarios', uid);
    await updateDoc(userDocRef, alteracoes);
  } catch (err: any) {
    console.warn('Aviso Firestore ao aprovar usuário:', err?.message || err);
  }

  atualizarNoLocalStorage<Usuario>('usuarios', uid, alteracoes);

  const atualizado = await buscarUsuarioPorId(uid);
  return (
    atualizado || {
      id: uid,
      nome: 'Usuário',
      email: '',
      perfil,
      status: 'aprovado',
      aprovado: true,
      ativo: true,
      criadoEm: agora,
      aprovadoPor: aprovadorEmail,
      aprovadoEm: agora,
    }
  );
}

/**
 * Rejeita o cadastro de um usuário, bloqueando seu acesso ao sistema.
 */
export async function rejeitarUsuario(
  uid: string,
  motivo: string,
  aprovadorEmail: string
): Promise<Usuario> {
  const agora = new Date().toISOString();
  const alteracoes: Partial<Usuario> = {
    status: 'rejeitado',
    aprovado: false,
    ativo: false,
    motivoRejeicao: motivo,
    aprovadoPor: aprovadorEmail,
    aprovadoEm: agora,
  };

  try {
    const userDocRef = doc(db, 'usuarios', uid);
    await updateDoc(userDocRef, alteracoes);
  } catch (err: any) {
    console.warn('Aviso Firestore ao rejeitar usuário:', err?.message || err);
  }

  atualizarNoLocalStorage<Usuario>('usuarios', uid, alteracoes);

  const atualizado = await buscarUsuarioPorId(uid);
  return (
    atualizado || {
      id: uid,
      nome: 'Usuário',
      email: '',
      perfil: 'producao',
      status: 'rejeitado',
      aprovado: false,
      ativo: false,
      criadoEm: agora,
      motivoRejeicao: motivo,
      aprovadoPor: aprovadorEmail,
      aprovadoEm: agora,
    }
  );
}

/**
 * Atualiza o cargo / perfil de atuação de um usuário.
 */
export async function atualizarPerfilUsuario(
  uid: string,
  novoPerfil: PerfilUsuario
): Promise<Usuario> {
  const alteracoes: Partial<Usuario> = {
    perfil: novoPerfil,
  };

  try {
    const userDocRef = doc(db, 'usuarios', uid);
    await updateDoc(userDocRef, alteracoes);
  } catch (err: any) {
    console.warn('Aviso Firestore ao atualizar perfil de usuário:', err?.message || err);
  }

  atualizarNoLocalStorage<Usuario>('usuarios', uid, alteracoes);

  const atualizado = await buscarUsuarioPorId(uid);
  return (
    atualizado || {
      id: uid,
      nome: 'Usuário',
      email: '',
      perfil: novoPerfil,
      status: 'aprovado',
      aprovado: true,
      ativo: true,
      criadoEm: new Date().toISOString(),
    }
  );
}

/**
 * Alterna o status ativo / inativo de um usuário.
 */
export async function alternarStatusAtivo(uid: string, ativo: boolean): Promise<Usuario> {
  const alteracoes: Partial<Usuario> = {
    ativo,
  };

  try {
    const userDocRef = doc(db, 'usuarios', uid);
    await updateDoc(userDocRef, alteracoes);
  } catch (err: any) {
    console.warn('Aviso Firestore ao alternar status ativo de usuário:', err?.message || err);
  }

  atualizarNoLocalStorage<Usuario>('usuarios', uid, alteracoes);

  const atualizado = await buscarUsuarioPorId(uid);
  return (
    atualizado || {
      id: uid,
      nome: 'Usuário',
      email: '',
      perfil: 'producao',
      status: 'aprovado',
      aprovado: true,
      ativo,
      criadoEm: new Date().toISOString(),
    }
  );
}
