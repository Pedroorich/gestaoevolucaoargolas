'use client';

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PerfilUsuario } from '@/types/domain';
import { validatePasswordStrength, ADMIN_MASTER_EMAIL } from '@/lib/auth/security';

export const AuthScreen: React.FC = () => {
  const { login, cadastrar, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'cadastro'>('login');

  // Campos do Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [showLoginSenha, setShowLoginSenha] = useState(false);

  // Campos do Cadastro
  const [cadNome, setCadNome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSetor, setCadSetor] = useState<PerfilUsuario>('producao');
  const [cadSenha, setCadSenha] = useState('');
  const [cadConfirmaSenha, setCadConfirmaSenha] = useState('');
  const [showCadSenha, setShowCadSenha] = useState(false);

  // Estados de feedback e erro
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Validação dinâmica de senha para o cadastro
  const passwordEvaluation = validatePasswordStrength(cadSenha);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    setSucessoMsg(null);

    if (!loginEmail.trim() || !loginSenha) {
      setErroMsg('Por favor, informe seu e-mail e sua senha.');
      return;
    }

    try {
      await login(loginEmail, loginSenha);
    } catch (err: any) {
      setErroMsg(err?.message || 'Falha ao autenticar.');
    }
  };

  const handleCadastroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);
    setSucessoMsg(null);

    if (!cadNome.trim()) {
      setErroMsg('Por favor, digite seu nome completo.');
      return;
    }

    if (!cadEmail.trim()) {
      setErroMsg('Por favor, informe seu endereço de e-mail.');
      return;
    }

    if (!passwordEvaluation.isValid) {
      setErroMsg(passwordEvaluation.errors[0] || 'A senha não atende aos requisitos de segurança.');
      return;
    }

    if (cadSenha !== cadConfirmaSenha) {
      setErroMsg('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    try {
      await cadastrar(cadNome, cadEmail, cadSenha, cadSetor);
      setSucessoMsg('Cadastro concluído com sucesso!');
    } catch (err: any) {
      setErroMsg(err?.message || 'Falha ao realizar cadastro.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-3">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Cabeçalho de Boas-vindas com Identidade Visual */}
        <div className="bg-brand-black text-white p-6 text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <span className="w-4 h-4 rounded-full bg-brand-orange inline-block" />
            <span className="font-extrabold text-xl tracking-tight">Evolução Argolas</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {activeTab === 'login' ? 'Entrar no Sistema' : 'Cadastre seu Acesso'}
          </h1>
          <p className="text-gray-300 text-xs md:text-sm">
            {activeTab === 'login'
              ? 'Informe suas credenciais para acessar o painel'
              : 'Preencha seus dados para solicitar acesso'}
          </p>
        </div>

        {/* Alternador de Abas (Login / Cadastro) */}
        <div className="grid grid-cols-2 bg-gray-100 p-1.5 border-b border-gray-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErroMsg(null);
              setSucessoMsg(null);
            }}
            className={`min-h-[46px] rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Entrar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cadastro');
              setErroMsg(null);
              setSucessoMsg(null);
            }}
            className={`min-h-[46px] rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'cadastro'
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Criar Conta</span>
          </button>
        </div>

        {/* Mensagens de Erro ou Sucesso */}
        <div className="px-6 pt-4">
          {erroMsg && (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-2xl text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold leading-snug">{erroMsg}</span>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-3.5 bg-green-50 border-2 border-green-300 rounded-2xl text-green-800 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 mt-0.5" />
              <span className="font-semibold leading-snug">{sucessoMsg}</span>
            </div>
          )}
        </div>

        {/* Formulário: ABA ENTRAR */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Seu e-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  autoComplete="email"
                  required
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-senha"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Sua senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-senha"
                  type={showLoginSenha ? 'text' : 'password'}
                  value={loginSenha}
                  onChange={(e) => setLoginSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full min-h-[48px] pl-11 pr-12 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
                <button
                  type="button"
                  aria-label={showLoginSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowLoginSenha(!showLoginSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                >
                  {showLoginSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl bg-brand-orange text-white font-black hover:bg-orange-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-60 text-base tracking-wide"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isLoading ? 'Autenticando...' : 'Acessar Sistema'}</span>
            </button>

            <div className="pt-2 text-center text-xs text-gray-500">
              Protegido com controle de tentativas e liberação exclusiva pelo admin geral (
              <span className="font-semibold text-gray-700">{ADMIN_MASTER_EMAIL}</span>).
            </div>
          </form>
        )}

        {/* Formulário: ABA CRIAR CONTA */}
        {activeTab === 'cadastro' && (
          <form onSubmit={handleCadastroSubmit} className="p-6 space-y-4">
            <div>
              <label
                htmlFor="cad-nome"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Nome Completo
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cad-nome"
                  type="text"
                  value={cadNome}
                  onChange={(e) => setCadNome(e.target.value)}
                  placeholder="Nome do colaborador"
                  autoComplete="name"
                  required
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cad-email"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Seu e-mail
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cad-email"
                  type="email"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  placeholder="colaborador@gmail.com"
                  autoComplete="email"
                  required
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cad-setor"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Setor / Área de Atuação
              </label>
              <div className="relative">
                <Briefcase className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="cad-setor"
                  value={cadSetor}
                  onChange={(e) => setCadSetor(e.target.value as PerfilUsuario)}
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium bg-white"
                >
                  <option value="producao">Produção (Fábrica / Lotes)</option>
                  <option value="logistica">Logística (Vendas / Entregas / Van)</option>
                  <option value="gestao">Gestão (Administração Geral)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="cad-senha"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Sua senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cad-senha"
                  type={showCadSenha ? 'text' : 'password'}
                  value={cadSenha}
                  onChange={(e) => setCadSenha(e.target.value)}
                  placeholder="Crie uma senha forte"
                  autoComplete="new-password"
                  required
                  className="w-full min-h-[48px] pl-11 pr-12 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
                <button
                  type="button"
                  aria-label={showCadSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowCadSenha(!showCadSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1"
                >
                  {showCadSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Indicador de Força de Senha */}
              {cadSenha.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-full transition-all ${
                          passwordEvaluation.score >= step
                            ? passwordEvaluation.score === 4
                              ? 'bg-green-500'
                              : passwordEvaluation.score === 3
                              ? 'bg-yellow-500'
                              : 'bg-orange-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Checklist visual de requisitos */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs pt-1">
                    <span
                      className={`flex items-center gap-1 ${
                        cadSenha.length >= 8 ? 'text-green-700 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {cadSenha.length >= 8 ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      8+ caracteres
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        /[A-Z]/.test(cadSenha) ? 'text-green-700 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {/[A-Z]/.test(cadSenha) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      Letra maiúscula
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        /[0-9]/.test(cadSenha) ? 'text-green-700 font-semibold' : 'text-gray-500'
                      }`}
                    >
                      {/[0-9]/.test(cadSenha) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      Número
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(cadSenha)
                          ? 'text-green-700 font-semibold'
                          : 'text-gray-500'
                      }`}
                    >
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(cadSenha) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      Caractere especial
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="cad-confirma"
                className="block text-sm font-bold text-gray-800 mb-1.5"
              >
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="cad-confirma"
                  type={showCadSenha ? 'text' : 'password'}
                  value={cadConfirmaSenha}
                  onChange={(e) => setCadConfirmaSenha(e.target.value)}
                  placeholder="Repita sua senha"
                  autoComplete="new-password"
                  required
                  className="w-full min-h-[48px] pl-11 pr-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-brand-orange focus:ring-2 focus:ring-orange-200 outline-none text-base text-gray-900 transition-all font-medium"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-bold">Aviso Importante:</span> Por segurança, após a criação da
              conta, seu login precisará ser aprovado pelo administrador geral (
              <span className="font-semibold underline">{ADMIN_MASTER_EMAIL}</span>) antes de
              acessar as informações da empresa.
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[50px] mt-2 py-3 px-4 rounded-2xl bg-brand-orange text-white font-black hover:bg-orange-600 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-60 text-base tracking-wide"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isLoading ? 'Cadastrando...' : 'Criar Minha Conta'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
