'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Award,
  Phone,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listarClientesCompleto,
  cadastrarClienteRapido,
} from '@/lib/firebase/vendas-service';
import { Cliente } from '@/types/domain';

export default function ClientesGestaoPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novaCidade, setNovaCidade] = useState('São Paulo');
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const lista = await listarClientesCompleto();
      setClientes(lista);
    } catch (err) {
      console.error('Erro ao listar clientes:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    setSalvando(true);
    try {
      await cadastrarClienteRapido(
        {
          nome: novoNome.trim(),
          telefone: novoTelefone.trim(),
          cidade: novaCidade.trim(),
        },
        'usuario-gestao',
        'Administrador'
      );
      setNovoNome('');
      setNovoTelefone('');
      setModalNovoAberto(false);
      await carregar();
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar cliente');
    } finally {
      setSalvando(false);
    }
  };

  const calcularDiasSemComprar = (dataUltimaCompra?: Date | null): number | null => {
    if (!dataUltimaCompra) return null;
    const data = dataUltimaCompra instanceof Date ? dataUltimaCompra : new Date(dataUltimaCompra);
    const diffMs = Date.now() - data.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.cidade.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca)
  );

  const clientesAlerta30Dias = clientes.filter((c) => {
    const dias = calcularDiasSemComprar(c.dataUltimaCompra);
    return dias !== null && dias >= 30;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-700"
            aria-label="Voltar para a página inicial"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-black">
              Gestão de Clientes & Retenção
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Acompanhe histórico, clientes fiéis e alertas de recompra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center gap-2 text-base min-h-[48px]"
          >
            <Plus className="w-5 h-5" />
            Novo Cliente
          </Button>

          <Button
            variant="secondary"
            onClick={carregar}
            disabled={carregando}
            aria-label="Atualizar lista"
            className="p-3 min-h-[48px] min-w-[48px] flex items-center justify-center border-gray-300"
          >
            <RefreshCw className={`w-5 h-5 text-gray-700 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Alerta de Retenção (Regra de Negócio: Cliente sem comprar há +1 mês) */}
      {clientesAlerta30Dias.length > 0 && (
        <div
          role="alert"
          className="bg-amber-50 border-2 border-amber-500 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-lg md:text-xl font-extrabold text-amber-950">
                Alerta de Recompra: {clientesAlerta30Dias.length}{' '}
                {clientesAlerta30Dias.length === 1
                  ? 'cliente está'
                  : 'clientes estão'}{' '}
                há mais de 30 dias sem comprar!
              </p>
              <p className="text-base text-amber-800">
                Clientes habituais que ficam mais de 1 mês sem pedir argolas merecem um contato
                proativo pelo WhatsApp ou telefone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente por nome, telefone ou cidade..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-300 text-lg focus:border-brand-blue focus:outline-none min-h-[48px]"
        />
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-4">
        {carregando ? (
          <div className="p-8 text-center text-gray-500 text-lg">Carregando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border-2 border-dashed border-gray-300 text-lg">
            Nenhum cliente encontrado. Clique em &quot;Novo Cliente&quot; para cadastrar.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientesFiltrados.map((cli) => {
              const diasSemComprar = calcularDiasSemComprar(cli.dataUltimaCompra);
              const isAlerta = diasSemComprar !== null && diasSemComprar >= 30;
              const isFiel = cli.totalCompras >= 3 || cli.situacao === 'cliente_fiel';

              return (
                <Card
                  key={cli.id}
                  className={`border-2 transition-all ${
                    isAlerta
                      ? 'border-amber-400 bg-amber-50/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-brand-black">{cli.nome}</h2>
                        {isFiel && (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-brand-blue text-xs md:text-sm font-bold px-2 py-0.5 rounded-md">
                            <Award className="w-4 h-4" />
                            Cliente Fiel (3+ compras)
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-base mt-1">
                        {cli.cidade} {cli.telefone ? `• ${cli.telefone}` : ''}
                      </p>
                    </div>

                    <span className="bg-gray-100 text-gray-800 text-sm font-bold px-3 py-1 rounded-xl shrink-0">
                      {cli.totalCompras} {cli.totalCompras === 1 ? 'compra' : 'compras'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-sm">
                      {cli.dataUltimaCompra ? (
                        <div>
                          <span className="text-gray-500">Última compra: </span>
                          <span className="font-semibold text-gray-800">
                            {new Date(cli.dataUltimaCompra).toLocaleDateString('pt-BR')} (há{' '}
                            {diasSemComprar} dias)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Nenhuma compra registrada ainda</span>
                      )}
                    </div>

                    {isAlerta && (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="w-4 h-4" />
                        Inativo há +30 dias!
                      </span>
                    )}

                    {cli.telefone && (
                      <a
                        href={`https://wa.me/55${cli.telefone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm min-h-[44px]"
                      >
                        <Phone className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Cliente */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl border-2 border-gray-300">
            <h2 className="text-2xl font-extrabold text-brand-black">Cadastrar Novo Cliente</h2>
            <form onSubmit={handleCadastrar} className="space-y-4">
              <div>
                <label className="block text-base font-bold text-gray-800 mb-1">
                  Nome / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Chaveiro Central"
                  className="w-full p-3 text-lg border-2 border-gray-300 rounded-xl focus:border-brand-blue min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full p-3 text-lg border-2 border-gray-300 rounded-xl focus:border-brand-blue min-h-[48px]"
                />
              </div>

              <div>
                <label className="block text-base font-bold text-gray-800 mb-1">Cidade</label>
                <input
                  type="text"
                  value={novaCidade}
                  onChange={(e) => setNovaCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="w-full p-3 text-lg border-2 border-gray-300 rounded-xl focus:border-brand-blue min-h-[48px]"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalNovoAberto(false)}
                  className="w-1/2 min-h-[48px] text-base"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={salvando}
                  className="w-1/2 min-h-[48px] text-base"
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
