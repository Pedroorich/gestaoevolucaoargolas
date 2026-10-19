'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  Briefcase,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PerfilUsuario, Usuario } from '@/types/domain';
import {
  listarUsuarios,
  aprovarUsuario,
  rejeitarUsuario,
  atualizarPerfilUsuario,
  alternarStatusAtivo,
} from '@/lib/firebase/user-service';
import { ADMIN_MASTER_EMAIL, isAdminMasterEmail } from '@/lib/auth/security';

export const PainelAprovacoes: React.FC = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [perfilSelecionadoMap, setPerfilSelecionadoMap] = useState<Record<string, PerfilUsuario>>({});
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    setMensagemErro(null);
    try {
      const lista = await listarUsuarios();
      setUsuarios(lista);

      // Preenche mapa inicial de perfis
      const mapa: Record<string, PerfilUsuario> = {};
      lista.forEach((u) => {
        mapa[u.id] = u.perfil;
      });
      setPerfilSelecionadoMap(mapa);
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao carregar lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const pendentes = usuarios.filter((u) => u.status === 'pendente' || !u.aprovado);
  const aprovados = usuarios.filter(
    (u) => u.status === 'aprovado' && u.aprovado && u.ativo !== false
  );
  const inativosOuRejeitados = usuarios.filter(
    (u) => u.status === 'rejeitado' || u.ativo === false
  );

  const handleAprovar = async (u: Usuario) => {
    setProcessandoId(u.id);
    setMensagemErro(null);
    setMensagemSucesso(null);
    try {
      const perfilFinal = perfilSelecionadoMap[u.id] || u.perfil || 'producao';
      const aprovador = user?.email || ADMIN_MASTER_EMAIL;
      await aprovarUsuario(u.id, perfilFinal, aprovador);
      setMensagemSucesso(`Acesso de ${u.nome} aprovado com sucesso como ${perfilFinal.toUpperCase()}!`);
      await carregar();
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao aprovar usuário.');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleRejeitar = async (u: Usuario) => {
    const confirmou = window.confirm(`Deseja recusar o acesso de ${u.nome}?`);
    if (!confirmou) return;

    setProcessandoId(u.id);
    setMensagemErro(null);
    setMensagemSucesso(null);
    try {
      const aprovador = user?.email || ADMIN_MASTER_EMAIL;
      await rejeitarUsuario(u.id, 'Acesso recusado pelo administrador geral', aprovador);
      setMensagemSucesso(`Acesso de ${u.nome} foi recusado.`);
      await carregar();
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao recusar usuário.');
    } finally {
      setProcessandoId(null);
    }
  };

  const handleMudarPerfil = async (u: Usuario, novoPerfil: PerfilUsuario) => {
    setPerfilSelecionadoMap((prev) => ({ ...prev, [u.id]: novoPerfil }));
    if (u.status === 'aprovado') {
      setProcessandoId(u.id);
      try {
        await atualizarPerfilUsuario(u.id, novoPerfil);
        setMensagemSucesso(`Setor de ${u.nome} alterado para ${novoPerfil.toUpperCase()}.`);
        await carregar();
      } catch (err: any) {
        setMensagemErro(err?.message || 'Falha ao atualizar perfil.');
      } finally {
        setProcessandoId(null);
      }
    }
  };

  const handleAlternarAtivo = async (u: Usuario) => {
    if (isAdminMasterEmail(u.email)) {
      alert('O Administrador Geral Master não pode ser desativado.');
      return;
    }

    const novoStatus = !u.ativo;
    setProcessandoId(u.id);
    try {
      await alternarStatusAtivo(u.id, novoStatus);
      setMensagemSucesso(
        novoStatus ? `Usuário ${u.nome} foi reativado.` : `Usuário ${u.nome} foi desativado.`
      );
      await carregar();
    } catch (err: any) {
      setMensagemErro(err?.message || 'Falha ao alterar status ativo.');
    } finally {
      setProcessandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Painel */}
      <div className="bg-brand-black text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-orange text-white rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Aprovações e Gestão de Usuários
            </h1>
            <p className="text-xs md:text-sm text-gray-300">
              Painel exclusivo do Administrador Geral ({ADMIN_MASTER_EMAIL})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={carregar}
          disabled={loading}
          className="min-h-[44px] px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl text-green-900 text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <span className="font-semibold">{mensagemSucesso}</span>
        </div>
      )}

      {mensagemErro && (
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-semibold">{mensagemErro}</span>
        </div>
      )}

      {/* 1. SEÇÃO DE SOLICITAÇÕES PENDENTES */}
      <div className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-black text-gray-900">
              Cadastros Aguardando Sua Aprovação
            </h2>
          </div>
          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
            {pendentes.length} {pendentes.length === 1 ? 'pendente' : 'pendentes'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-6 text-gray-500 font-medium text-sm">
            Carregando solicitações...
          </div>
        ) : pendentes.length === 0 ? (
          <div className="text-center py-6 text-gray-500 font-medium text-sm">
            Nenhum cadastro aguardando aprovação no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {pendentes.map((u) => {
              const perfilAtual = perfilSelecionadoMap[u.id] || u.perfil;
              const emProcesso = processandoId === u.id;

              return (
                <div
                  key={u.id}
                  className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">{u.nome}</span>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-xs font-semibold rounded-md uppercase">
                        Aguardando
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      E-mail: <strong className="text-gray-800">{u.email}</strong>
                    </div>
                    <div className="text-xs text-gray-500">
                      Solicitado em: {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Ações de aprovação */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <select
                        aria-label={`Setor para ${u.nome}`}
                        value={perfilAtual}
                        onChange={(e) => handleMudarPerfil(u, e.target.value as PerfilUsuario)}
                        className="text-xs font-bold text-gray-800 bg-transparent outline-none"
                      >
                        <option value="producao">Produção</option>
                        <option value="logistica">Logística</option>
                        <option value="gestao">Gestão</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={emProcesso}
                      onClick={() => handleAprovar(u)}
                      className="min-h-[44px] px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{emProcesso ? 'Aprovando...' : 'Aprovar'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={emProcesso}
                      onClick={() => handleRejeitar(u)}
                      className="min-h-[44px] px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SEÇÃO DE USUÁRIOS APROVADOS E EQUIPE */}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-black text-gray-900">Equipe com Acesso Liberado</h2>
          </div>
          <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-black rounded-full">
            {aprovados.length} {aprovados.length === 1 ? 'ativo' : 'ativos'}
          </span>
        </div>

        <div className="space-y-3">
          {aprovados.map((u) => {
            const isMaster = isAdminMasterEmail(u.email);
            const emProcesso = processandoId === u.id;

            return (
              <div
                key={u.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-base">{u.nome}</span>
                    {isMaster ? (
                      <span className="px-2 py-0.5 bg-brand-orange text-white text-xs font-black rounded-md flex items-center gap-1 shadow-sm">
                        <Crown className="w-3.5 h-3.5" />
                        Administrador Geral
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-xs font-bold rounded-md uppercase">
                        {u.perfil}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    E-mail: <strong className="text-gray-800">{u.email}</strong>
                  </div>
                  {u.aprovadoPor && (
                    <div className="text-xs text-gray-500">
                      Aprovado por: {u.aprovadoPor} em{' '}
                      {u.aprovadoEm ? new Date(u.aprovadoEm).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  )}
                </div>

                {!isMaster && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-2.5 py-1.5">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      <select
                        aria-label={`Alterar setor de ${u.nome}`}
                        value={u.perfil}
                        onChange={(e) => handleMudarPerfil(u, e.target.value as PerfilUsuario)}
                        className="text-xs font-bold text-gray-800 bg-transparent outline-none"
                      >
                        <option value="producao">Produção</option>
                        <option value="logistica">Logística</option>
                        <option value="gestao">Gestão</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={emProcesso}
                      onClick={() => handleAlternarAtivo(u)}
                      className="min-h-[40px] px-3 py-1.5 text-xs font-bold rounded-xl border border-red-300 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Desativar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SEÇÃO DE CONTAS INATIVAS OU RECUSADAS */}
      {inativosOuRejeitados.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <UserX className="w-4 h-4 text-gray-500" />
            <span>Contas Inativas ou Recusadas ({inativosOuRejeitados.length})</span>
          </h3>
          <div className="space-y-2">
            {inativosOuRejeitados.map((u) => (
              <div
                key={u.id}
                className="p-3 bg-gray-100 rounded-xl flex items-center justify-between text-xs text-gray-600"
              >
                <div>
                  <span className="font-bold text-gray-800">{u.nome}</span> ({u.email}) —{' '}
                  <span className="text-red-600 font-semibold">
                    {u.status === 'rejeitado' ? 'Recusado' : 'Inativo'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAprovar(u)}
                  className="px-2.5 py-1 bg-gray-800 text-white rounded-lg font-bold hover:bg-black text-xs"
                >
                  Reativar Acesso
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
