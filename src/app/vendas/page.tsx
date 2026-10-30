"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PlusCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  listarPedidosVendas,
  listarClientesParaVenda,
  observarPedidosVendas,
  observarClientes,
  criarPedidoVenda,
  atualizarSituacaoPedido,
  cadastrarClienteRapido,
  excluirPedidoLogico,
  NovoPedidoInput,
} from "@/lib/firebase/vendas-service";
import { listarSaidasAtivas, observarSaidasAtivas } from "@/lib/firebase/producao-service";
import { SaidaProducao, PedidoVenda, SituacaoPedido } from "@/types/domain";
import Button from "@/components/ui/Button";
import CardSaldoRemessas from "@/components/vendas/CardSaldoRemessas";
import ModalNovoPedido from "@/components/vendas/ModalNovoPedido";
import TabelaPedidosVendas from "@/components/vendas/TabelaPedidosVendas";

export default function VendasPage() {
  const { user } = useAuth();

  const [saidas, setSaidas] = useState<SaidaProducao[]>([]);
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [clientes, setClientes] = useState<
    Array<{ id: string; nome: string; cidade: string; telefone: string; endereco?: string }>
  >([]);

  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  const [modalNovoPedidoAberto, setModalNovoPedidoAberto] =
    useState<boolean>(false);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const [saidasData, pedidosData, clientesData] = await Promise.all([
        listarSaidasAtivas(),
        listarPedidosVendas(),
        listarClientesParaVenda(),
      ]);
      setSaidas(saidasData);
      setPedidos(pedidosData);
      setClientes(clientesData);
    } catch (err: any) {
      setErro("Não foi possível carregar os dados da logística e vendas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    // Carga inicial rápida
    carregarDados();

    // Sincronização em tempo real multi-dispositivos
    let unsubSaidas: (() => void) | undefined;
    let unsubPedidos: (() => void) | undefined;
    let unsubClientes: (() => void) | undefined;

    if (typeof observarSaidasAtivas === "function") {
      unsubSaidas = observarSaidasAtivas((novasSaidas) => {
        if (!ativo) return;
        setSaidas(novasSaidas);
        setCarregando(false);
      });
    }

    if (typeof observarPedidosVendas === "function") {
      unsubPedidos = observarPedidosVendas((novosPedidos) => {
        if (!ativo) return;
        setPedidos(novosPedidos);
        setCarregando(false);
      });
    }

    if (typeof observarClientes === "function") {
      unsubClientes = observarClientes((novosClientes) => {
        if (!ativo) return;
        setClientes(
          novosClientes.map((c) => ({
            id: c.id,
            nome: c.nome,
            cidade: c.cidade,
            telefone: c.telefone,
            endereco: c.endereco,
          }))
        );
      });
    }

    return () => {
      ativo = false;
      if (unsubSaidas) unsubSaidas();
      if (unsubPedidos) unsubPedidos();
      if (unsubClientes) unsubClientes();
    };
  }, [carregarDados]);

  async function handleCriarPedido(dados: NovoPedidoInput) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Vendedor / Logística";

    try {
      setErro(null);
      await criarPedidoVenda(dados, usuarioId, usuarioNome);
      setFeedbackSucesso("Pedido registrado com sucesso!");
      setTimeout(() => setFeedbackSucesso(null), 4000);
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Erro ao salvar pedido de venda.");
    }
  }

  async function handleAtualizarSituacao(
    pedidoId: string,
    novaSituacao: SituacaoPedido
  ) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Vendedor / Logística";

    try {
      setErro(null);
      await atualizarSituacaoPedido(pedidoId, novaSituacao, usuarioId, usuarioNome);
      setFeedbackSucesso(
        `Situação do pedido atualizada para "${novaSituacao}" com sucesso!`
      );
      setTimeout(() => setFeedbackSucesso(null), 4000);
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Erro ao atualizar situação do pedido.");
    }
  }

  async function handleExcluirPedido(pedidoId: string) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Vendedor / Logística";

    try {
      setErro(null);
      await excluirPedidoLogico(pedidoId, usuarioId, usuarioNome);
      setFeedbackSucesso("Pedido cancelado logicamente com sucesso!");
      setTimeout(() => setFeedbackSucesso(null), 4000);
      await carregarDados();
    } catch (err: any) {
      setErro(err.message || "Erro ao excluir pedido.");
    }
  }

  async function handleCadastrarClienteRapido(dados: {
    nome: string;
    telefone: string;
    cidade: string;
    endereco?: string;
  }) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Vendedor / Logística";

    const novoId = await cadastrarClienteRapido(dados, usuarioId, usuarioNome);
    setClientes((prev) => [
      ...prev,
      {
        id: novoId,
        nome: dados.nome,
        cidade: dados.cidade,
        telefone: dados.telefone,
        endereco: dados.endereco,
      },
    ]);
    return novoId;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Barra de Navegação e Título */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-300">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-bold text-blue-700 hover:text-blue-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Voltar ao Início
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Logística & Vendas
          </h1>
          <p className="text-slate-600 text-lg mt-1">
            Controle de pedidos, envios via transportadoras e saldo pronto para entrega.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={carregarDados}
            disabled={carregando}
            aria-label="Atualizar dados"
            className="min-h-[48px] px-4 py-3 text-base font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${carregando ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => setModalNovoPedidoAberto(true)}
            className="min-h-[48px] px-6 py-3 text-lg font-black bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-2 shadow-md"
          >
            <PlusCircle className="w-6 h-6" />
            <span>Novo Pedido</span>
          </Button>
        </div>
      </div>

      {/* Banner de Feedback de Sucesso */}
      {feedbackSucesso && (
        <div
          role="status"
          className="p-4 bg-emerald-100 border-2 border-emerald-600 rounded-xl text-emerald-950 font-bold text-lg flex items-center justify-between"
        >
          <span>{feedbackSucesso}</span>
          <button
            type="button"
            onClick={() => setFeedbackSucesso(null)}
            className="text-emerald-800 hover:text-emerald-950 text-xl font-black px-2"
            aria-label="Fechar mensagem de sucesso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner de Erro */}
      {erro && (
        <div
          role="alert"
          className="p-4 bg-red-100 border-2 border-red-500 rounded-xl text-red-950 font-bold text-lg flex items-center justify-between"
        >
          <span>{erro}</span>
          <button
            type="button"
            onClick={() => setErro(null)}
            className="text-red-800 hover:text-red-950 text-xl font-black px-2"
            aria-label="Fechar mensagem de erro"
          >
            ✕
          </button>
        </div>
      )}

      {/* Estado de Carregamento */}
      {carregando && (
        <div className="p-8 text-center text-slate-600 text-xl font-bold bg-white rounded-2xl border-2 border-slate-200">
          Carregando dados da logística e vendas...
        </div>
      )}

      {/* Conteúdo Principal */}
      {!carregando && (
        <>
          {/* Card de Estoque Pronto na Logística */}
          <section aria-labelledby="secao-estoque-logistica">
            <h2 id="secao-estoque-logistica" className="sr-only">
              Estoque da Logística
            </h2>
            <CardSaldoRemessas saidas={saidas} pedidos={pedidos} />
          </section>

          {/* Tabela de Pedidos de Venda */}
          <section aria-labelledby="secao-pedidos-vendas" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2
                id="secao-pedidos-vendas"
                className="text-2xl font-black text-slate-900"
              >
                Pedidos de Venda Recentes
              </h2>
              <span className="text-base font-bold text-slate-500">
                {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            <TabelaPedidosVendas
              pedidos={pedidos}
              onAtualizarSituacao={handleAtualizarSituacao}
              onExcluirPedido={handleExcluirPedido}
            />
          </section>
        </>
      )}

      {/* Modal de Novo Pedido */}
      <ModalNovoPedido
        isOpen={modalNovoPedidoAberto}
        onClose={() => setModalNovoPedidoAberto(false)}
        onSubmit={handleCriarPedido}
        saidasDisponiveis={saidas}
        pedidosExistentes={pedidos}
        clientes={clientes}
        onCadastrarClienteRapido={handleCadastrarClienteRapido}
        usuarioId={user?.id}
      />
    </div>
  );
}
