'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { PerfilUsuario, Usuario, StatusUsuario } from '@/types/domain';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  sanitizeEmail,
  sanitizeName,
  validatePasswordStrength,
  isAdminMasterEmail,
  verifyAdminPassword,
  ADMIN_MASTER_EMAIL,
} from '@/lib/auth/security';
import {
  buildInitialUserData,
  salvarPerfilUsuario,
  buscarUsuarioPorId,
} from '@/lib/firebase/user-service';
import { limparDadosLocaisExcetoLogin } from '@/lib/storage/offline-fallback';

// Garante que qualquer resquício de teste local no navegador seja purgado, mantendo apenas o login
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem('evolucao_limpeza_inicial_v1') !== 'concluida') {
      limparDadosLocaisExcetoLogin();
      localStorage.setItem('evolucao_limpeza_inicial_v1', 'concluida');
    }
  } catch {
    // Ignora restrições de storage
  }
}

export interface AuthContextType {
  user: Usuario | null;
  firebaseUser: FirebaseUser | null;
  perfil: PerfilUsuario | null;
  statusAprovacao: StatusUsuario | null;
  isAprovado: boolean;
  isAdminMaster: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  cadastrar: (
    nome: string,
    email: string,
    pass: string,
    perfilDesejado?: PerfilUsuario
  ) => Promise<Usuario>;
  logout: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
}

/**
 * Função pura para verificação de controle de acesso (RBAC).
 * Regra Obrigatória nº 1: Toda permissão é verificada no servidor / regras de acesso.
 */
export function canAccessModule(perfil: PerfilUsuario, modulo: string): boolean {
  if (perfil === 'gestao') return true;

  if (perfil === 'producao') {
    return ['producao', 'estoque', 'perdas', 'saidas'].includes(modulo);
  }

  if (perfil === 'logistica') {
    return ['vendas', 'entregas', 'clientes', 'despesas_logistica'].includes(modulo);
  }

  return false;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Carrega os dados detalhados do usuário a partir do Firestore/local storage
  const carregarDadosUsuario = async (fbUser: FirebaseUser) => {
    try {
      let dados = await buscarUsuarioPorId(fbUser.uid);

      if (!dados) {
        // Se ainda não existe documento no banco, inicializa
        dados = buildInitialUserData({
          uid: fbUser.uid,
          email: fbUser.email || '',
          nome: fbUser.displayName || 'Usuário',
        });
        await salvarPerfilUsuario(dados);
      } else if (isAdminMasterEmail(fbUser.email) && (!dados.aprovado || !dados.isAdminMaster)) {
        // Garante que ph44608@gmail.com sempre tenha privilégios master
        dados = {
          ...dados,
          status: 'aprovado',
          aprovado: true,
          isAdminMaster: true,
          perfil: 'gestao',
          ativo: true,
        };
        await salvarPerfilUsuario(dados);
      }

      setUser(dados);
    } catch (err) {
      console.warn('Erro ao carregar dados do usuário:', err);
      const isMaster = isAdminMasterEmail(fbUser.email);
      setUser({
        id: fbUser.uid,
        nome: fbUser.displayName || 'Usuário',
        email: fbUser.email || '',
        perfil: isMaster ? 'gestao' : 'producao',
        status: isMaster ? 'aprovado' : 'pendente',
        aprovado: isMaster,
        isAdminMaster: isMaster,
        ativo: true,
        criadoEm: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        await carregarDadosUsuario(fbUser);
      } else {
        // Verifica se há sessão local ativa persistida (ex: master admin ou offline)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('evolucao_auth_session');
            if (raw) {
              const session = JSON.parse(raw);
              if (session?.uid) {
                const u = await buscarUsuarioPorId(session.uid);
                if (u && u.ativo !== false && u.status === 'aprovado') {
                  setUser(u);
                  setFirebaseUser({
                    uid: u.id,
                    email: u.email,
                    displayName: u.nome,
                  } as any);
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch {
            // Ignora erro de storage
          }
        }
        setUser(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const recarregarUsuario = async () => {
    if (firebaseUser) {
      setIsLoading(true);
      await carregarDadosUsuario(firebaseUser);
      setIsLoading(false);
    } else if (user?.id) {
      setIsLoading(true);
      const u = await buscarUsuarioPorId(user.id);
      if (u) setUser(u);
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string): Promise<void> => {
    const cleanEmail = sanitizeEmail(email);

    // 1. Verificação de Rate Limit (Defesa contra Brute-Force)
    const rateCheck = checkRateLimit(cleanEmail);
    if (rateCheck.isBlocked) {
      throw new Error(
        `Acesso temporariamente bloqueado por muitas tentativas inválidas. Aguarde ${rateCheck.waitSeconds} segundos antes de tentar novamente.`
      );
    }

    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      resetRateLimit(cleanEmail);
      if (cred.user) {
        await carregarDadosUsuario(cred.user);
      }
    } catch (err: any) {
      // 2. Verificação de credencial para o Administrador Geral Master (ph44608@gmail.com)
      const isMaster = isAdminMasterEmail(cleanEmail);
      const isMasterPassValid = isMaster && (await verifyAdminPassword(pass));

      if (isMaster && isMasterPassValid) {
        resetRateLimit(cleanEmail);
        const adminUid = 'admin-master-ph44608';
        let dadosAdmin = await buscarUsuarioPorId(adminUid);
        if (!dadosAdmin) {
          dadosAdmin = {
            id: adminUid,
            nome: 'Administrador Geral',
            email: ADMIN_MASTER_EMAIL,
            perfil: 'gestao',
            status: 'aprovado',
            aprovado: true,
            isAdminMaster: true,
            ativo: true,
            criadoEm: new Date().toISOString(),
            aprovadoPor: 'sistema-auto',
            aprovadoEm: new Date().toISOString(),
          };
          await salvarPerfilUsuario(dadosAdmin);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'evolucao_auth_session',
            JSON.stringify({ uid: adminUid, email: ADMIN_MASTER_EMAIL })
          );
        }

        setUser(dadosAdmin);
        setFirebaseUser({
          uid: adminUid,
          email: ADMIN_MASTER_EMAIL,
          displayName: 'Administrador Geral',
        } as any);
        return;
      }

      // Registra a falha no rate limiter
      const failed = recordFailedAttempt(cleanEmail);

      let msg = 'E-mail ou senha incorretos.';
      if (failed.isBlocked) {
        msg = `Muitas tentativas incorretas. Sua conta está temporariamente bloqueada por ${failed.waitSeconds} segundos.`;
      } else if (err?.code === 'auth/too-many-requests') {
        msg = 'Muitas tentativas consecutivas detectadas. Aguarde alguns instantes.';
      } else if (err?.code === 'auth/network-request-failed') {
        msg = 'Falha de conexão com a internet. Verifique sua rede.';
      }

      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const cadastrar = async (
    nome: string,
    email: string,
    pass: string,
    perfilDesejado: PerfilUsuario = 'producao'
  ): Promise<Usuario> => {
    const cleanEmail = sanitizeEmail(email);
    const cleanName = sanitizeName(nome);

    // Validação estrita da senha
    const strength = validatePasswordStrength(pass);
    if (!strength.isValid) {
      throw new Error(strength.errors[0]);
    }

    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const novoUsuario = buildInitialUserData({
        uid: cred.user.uid,
        email: cleanEmail,
        nome: cleanName,
        perfilDesejado,
      });

      await salvarPerfilUsuario(novoUsuario);
      resetRateLimit(cleanEmail);
      setUser(novoUsuario);
      return novoUsuario;
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está cadastrado no sistema. Faça login com suas credenciais.');
      } else if (err?.code === 'auth/weak-password') {
        throw new Error('A senha fornecida é muito fraca.');
      }

      // Se Firebase Auth não estiver configurado com Email/Password no Console
      if (err?.code === 'auth/configuration-not-found') {
        const isMaster = isAdminMasterEmail(cleanEmail);
        const novoUsuario = buildInitialUserData({
          uid: isMaster ? 'admin-master-ph44608' : `usr-${Date.now()}`,
          email: cleanEmail,
          nome: cleanName,
          perfilDesejado,
        });

        await salvarPerfilUsuario(novoUsuario);
        resetRateLimit(cleanEmail);

        if (isMaster && (await verifyAdminPassword(pass))) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'evolucao_auth_session',
              JSON.stringify({ uid: novoUsuario.id, email: cleanEmail })
            );
          }
        }

        setUser(novoUsuario);
        return novoUsuario;
      }

      throw new Error(err?.message || 'Falha ao realizar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('evolucao_auth_session');
      }
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAprovado = !!user?.aprovado && user?.status === 'aprovado' && user?.ativo !== false;
  const isAdminMaster = !!user?.isAdminMaster || isAdminMasterEmail(user?.email);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        perfil: user?.perfil || null,
        statusAprovacao: user?.status || null,
        isAprovado,
        isAdminMaster,
        isLoading,
        login,
        cadastrar,
        logout,
        recarregarUsuario,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
