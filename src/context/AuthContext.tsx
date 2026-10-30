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
  checkRegistrationRateLimit,
  recordRegistrationAttempt,
  sanitizeEmail,
  sanitizeName,
  validatePasswordStrength,
  isAdminMasterEmail,
  verifyAdminPassword,
  hashPassword,
  timingSafeEqual,
  ADMIN_MASTER_EMAIL,
} from '@/lib/auth/security';
import {
  buildInitialUserData,
  salvarPerfilUsuario,
  buscarUsuarioPorId,
  buscarUsuarioPorEmail,
  atualizarSenhaUsuario,
  observarUsuarioPorId,
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
      if (!dados && fbUser.email) {
        dados = await buscarUsuarioPorEmail(fbUser.email);
      }

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
        // Verifica se há sessão local ativa persistida (ex: master admin, offline ou fallback)
        if (typeof window !== 'undefined') {
          try {
            const raw = localStorage.getItem('evolucao_auth_session');
            if (raw) {
              const session = JSON.parse(raw);
              let u: Usuario | null = null;
              if (session?.uid) {
                u = await buscarUsuarioPorId(session.uid);
              }
              if (!u && session?.email) {
                u = await buscarUsuarioPorEmail(session.email);
              }

              if (u) {
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

  // Escuta em tempo real atualizações no status do usuário (ex: liberação de aprovação pelo ADM em outro dispositivo)
  useEffect(() => {
    if (!user?.id || user.aprovado) return;

    let unsub: (() => void) | undefined;
    if (typeof observarUsuarioPorId === 'function') {
      unsub = observarUsuarioPorId(user.id, (usuarioAtualizado) => {
        if (usuarioAtualizado) {
          setUser(usuarioAtualizado);
        }
      });
    }

    return () => {
      if (unsub) unsub();
    };
  }, [user?.id, user?.aprovado]);

  const recarregarUsuario = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const u = await buscarUsuarioPorId(user.id);
        if (u) {
          setUser(u);
          return;
        }
      }
      if (user?.email) {
        const u = await buscarUsuarioPorEmail(user.email);
        if (u) {
          setUser(u);
          return;
        }
      }
      if (firebaseUser) {
        await carregarDadosUsuario(firebaseUser);
      }
    } finally {
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
      // Tenta login nativo no Firebase Authentication
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
        if (cred?.user) {
          resetRateLimit(cleanEmail);
          await carregarDadosUsuario(cred.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'evolucao_auth_session',
              JSON.stringify({ uid: cred.user.uid, email: cleanEmail })
            );
          }
          return;
        }
      } catch (fbAuthErr: any) {
        // Fallback resiliente caso Firebase Auth não esteja configurado com Email/Password
        // ou usuário exista no Firestore / banco de dados local
      }

      // 2. Verificação para o Administrador Geral Master (ph44608@gmail.com)
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

      // 3. Verificação Resiliente para Usuários Cadastrados no Banco (Firestore / Local)
      const usuario = await buscarUsuarioPorEmail(cleanEmail);
      if (usuario) {
        const passHash = await hashPassword(pass);
        let senhaValida = false;

        if (usuario.passwordHash) {
          senhaValida = timingSafeEqual(passHash, usuario.passwordHash);
        } else {
          // Conta legada aprovada pelo admin antes da adição do hash:
          // Se a senha informada for válida, associa o hash e permite login
          const strength = validatePasswordStrength(pass);
          if (strength.isValid || pass.length >= 6) {
            await atualizarSenhaUsuario(usuario.id, passHash);
            usuario.passwordHash = passHash;
            senhaValida = true;
          }
        }

        if (senhaValida) {
          resetRateLimit(cleanEmail);

          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'evolucao_auth_session',
              JSON.stringify({ uid: usuario.id, email: usuario.email })
            );
          }

          setUser(usuario);
          setFirebaseUser({
            uid: usuario.id,
            email: usuario.email,
            displayName: usuario.nome,
          } as any);
          return;
        }
      }

      // Registra a falha no rate limiter
      const failed = recordFailedAttempt(cleanEmail);

      let msg = 'E-mail ou senha incorretos.';
      if (failed.isBlocked) {
        msg = `Muitas tentativas incorretas. Sua conta está temporariamente bloqueada por ${failed.waitSeconds} segundos.`;
      } else if (rateCheck.waitSeconds > 0) {
        msg = `Aguarde ${rateCheck.waitSeconds} segundos antes de tentar novamente.`;
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

    // Proteção contra criação em massa e ataques de negação de serviço no registro
    const regLimit = checkRegistrationRateLimit(cleanEmail);
    if (regLimit.isBlocked) {
      throw new Error(
        `Muitas tentativas de cadastro recentes. Aguarde ${regLimit.waitSeconds} segundos antes de tentar novamente.`
      );
    }

    // Validação estrita da senha
    const strength = validatePasswordStrength(pass);
    if (!strength.isValid) {
      recordRegistrationAttempt(cleanEmail);
      throw new Error(strength.errors[0]);
    }

    setIsLoading(true);
    try {
      const passHash = await hashPassword(pass);

      // 1. Verifica se já existe um usuário com esse e-mail no banco
      const usuarioExistente = await buscarUsuarioPorEmail(cleanEmail);
      if (usuarioExistente) {
        // Se a conta já existe e não tinha hash salvo (migração de conta legada)
        if (!usuarioExistente.passwordHash) {
          await atualizarSenhaUsuario(usuarioExistente.id, passHash);
          usuarioExistente.passwordHash = passHash;
        }

        if (usuarioExistente.status === 'aprovado' && usuarioExistente.ativo !== false) {
          throw new Error('Este e-mail já está cadastrado e aprovado pelo administrador. Faça login diretamente com sua senha.');
        } else if (usuarioExistente.status === 'pendente') {
          throw new Error('Seu cadastro já foi realizado e está aguardando aprovação do administrador.');
        } else if (usuarioExistente.status === 'rejeitado' || usuarioExistente.ativo === false) {
          throw new Error('O cadastro com este e-mail foi desativado ou recusado pelo administrador.');
        }
      }

      const isMaster = isAdminMasterEmail(cleanEmail);
      let uid = isMaster ? 'admin-master-ph44608' : `usr-${Date.now()}`;

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
        if (cred?.user?.uid) {
          uid = cred.user.uid;
        }
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use') {
          throw new Error('Este e-mail já está cadastrado no sistema. Faça login com suas credenciais.');
        } else if (err?.code === 'auth/weak-password') {
          throw new Error('A senha fornecida é muito fraca.');
        }
        // Fallback para auth/configuration-not-found ou offline: segue com o UID gerado
      }

      const novoUsuario = buildInitialUserData({
        uid,
        email: cleanEmail,
        nome: cleanName,
        perfilDesejado,
        passwordHash: passHash,
      });

      await salvarPerfilUsuario(novoUsuario);
      resetRateLimit(cleanEmail);

      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'evolucao_auth_session',
          JSON.stringify({ uid: novoUsuario.id, email: cleanEmail })
        );
      }

      setUser(novoUsuario);
      setFirebaseUser({
        uid: novoUsuario.id,
        email: cleanEmail,
        displayName: cleanName,
      } as any);

      return novoUsuario;
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
      try {
        await signOut(auth);
      } catch {
        // Ignora falha de signOut se offline ou serviço não inicializado
      }
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
