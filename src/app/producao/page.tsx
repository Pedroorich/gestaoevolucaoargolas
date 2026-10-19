"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PackagePlus, Truck, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  listarLotesAtivos,
  listarSaidasAtivas,
  criarLote,
  criarSaida,
  excluirLoteLogico,
  concluirBanhoRemessa,
} from "@/lib/firebase/producao-service";
import {
  calcularSaldoLote,
  calcularEstoquePorModelo,
  calcularEstoqueTotal,
} from "@/lib/producao/estoque";
import { LoteProducao, SaidaProducao, TipoEnvio } from "@/types/domain";
import Button from "@/components/ui/Button";
import EstoqueCard from "@/components/producao/EstoqueCard";
import CardCargasEmBanho from "@/components/producao/CardCargasEmBanho";
import ModalNovoLote from "@/components/producao/ModalNovoLote";
import ModalNovaSaida from "@/components/producao/ModalNovaSaida";
import TabelaLotesRecentes from "@/components/producao/TabelaLotesRecentes";

export default function ProducaoPage() {
  const { user } = useAuth();

  const [lotes, setLotes] = useState<LoteProducao[]>([]);
  const [saidas, setSaidas] = useState<SaidaProducao[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedbackSucesso, setFeedbackSucesso] = useState<string | null>(null);

  const [modalNovoLoteAberto, setModalNovoLoteAberto] = useState<boolean>(false);
  const [modalNovaSaidaAberto, setModalNovaSaidaAberto] = useState<boolean>(false);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      const [lotesData, saidasData] = await Promise.all([
        listarLotesAtivos(),
        listarSaidasAtivas(),
      ]);
      setLotes(lotesData);
      setSaidas(saidasData);
    } catch (err: any) {
      setErro("Não foi possível carregar os dados da produção.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Cálculos dinâmicos de estoque
  const resumoPorModelo = calcularEstoquePorModelo(lotes, saidas);
  const resumoTotal = calcularEstoqueTotal(lotes, saidas);

  // Lotes com saldo disponível para carregar na van
  const lotesDisponiveis = lotes.map((lote) => ({
    lote,
    saldoDisponivel: calcularSaldoLote(lote, saidas),
  }));

  // Cargas atualmente em processo terceirizado de banho/metalização
  const cargasEmBanho = saidas.filter(
    (s) => s.ativo && s.destino === "banho" && s.statusBanho === "em_banho"
  );

  async function handleCriarLote(dados: {
    modeloId: string;
    quantidadeProduzida?: number;
    pesoKg?: number | null;
    perdas: number;
    observacoes?: string;
    custoMaterialCentavos?: number;
  }) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Operador de Produção";

    await criarLote(
      {
        data: new Date(),
        modeloId: dados.modeloId,
        quantidadeProduzida: dados.quantidadeProduzida,
        pesoKg: dados.pesoKg,
        perdas: dados.perdas,
        observacoes: dados.observacoes,
        custoMaterialCentavos: dados.custoMaterialCentavos,
        responsavelId: usuarioId,
      },
      usuarioId,
      usuarioNome
    );
    setFeedbackSucesso("Lote fabricado registrado com sucesso!");
    setTimeout(() => setFeedbackSucesso(null), 4000);
    await carregarDados();
  }

  async function handleCriarSaida(dados: {
    loteId: string;
    modeloId: string;
    quantidade: number;
    transporte: TipoEnvio;
    destino: "centro_logistica" | "banho";
  }) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Operador de Produção";

    const item = lotesDisponiveis.find((l) => l.lote.id === dados.loteId);
    const saldo = item ? item.saldoDisponivel : 0;

    await criarSaida(
      {
        loteId: dados.loteId,
        modeloId: dados.modeloId,
        quantidade: dados.quantidade,
        transporte: dados.transporte,
        destino: dados.destino,
        responsavelId: usuarioId,
      },
      saldo,
      usuarioId,
      usuarioNome
    );
    const msg =
      dados.destino === "banho"
        ? "Carga enviada para o Banho com sucesso!"
        : "Envio de argolas na van registrado com sucesso!";
    setFeedbackSucesso(msg);
    setTimeout(() => setFeedbackSucesso(null), 4000);
    await carregarDados();
  }

  async function handleConcluirBanho(saidaId: string) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Operador de Produção";

    await concluirBanhoRemessa(saidaId, usuarioId, usuarioNome);
    setFeedbackSucesso("Carga recebida do banho e liberada para o Centro de Logística!");
    setTimeout(() => setFeedbackSucesso(null), 4000);
    await carregarDados();
  }

  async function handleExcluirLote(loteId: string, motivo: string) {
    const usuarioId = user?.id || "usr-gestor";
    const usuarioNome = user?.nome || "Operador de Produção";

    await excluirLoteLogico(loteId, motivo, usuarioId, usuarioNome);
    setFeedbackSucesso("Lote desativado com sucesso.");
    setTimeout(() => setFeedbackSucesso(null), 4000);
    await carregarDados();
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Seção */}
      <div className="border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black">Centro de Produção</h1>
          <p className="text-neutral-600 text-lg">
            Controle de fabricação, perdas e carregamento da van.
          </p>
        </div>

        <button
          onClick={carregarDados}
          disabled={carregando}
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-black font-semibold text-base py-2 px-3 rounded-lg border border-neutral-300 min-h-[48px] self-start"
        >
          <RefreshCw className={`w-5 h-5 ${carregando ? "animate-spin" : ""}`} />
          <span>Atualizar Estoque</span>
        </button>
      </div>

      {feedbackSucesso && (
        <div
          role="status"
          className="p-4 bg-emerald-100 border-l-4 border-emerald-600 text-emerald-950 font-bold text-lg rounded-lg shadow-sm"
        >
          ✓ {feedbackSucesso}
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="p-4 bg-red-100 border-l-4 border-red-600 text-red-950 font-bold text-lg rounded-lg shadow-sm"
        >
          {erro}
        </div>
      )}

      {/* 2 Ações Primárias em Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          type="button"
          variant="primary"
          onClick={() => setModalNovoLoteAberto(true)}
          className="w-full min-h-[64px] text-xl shadow-md flex items-center justify-center gap-3"
        >
          <PackagePlus className="w-7 h-7 text-black" />
          <span>Lançar Novo Lote</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setModalNovaSaidaAberto(true)}
          className="w-full min-h-[64px] text-xl shadow-md flex items-center justify-center gap-3"
        >
          <Truck className="w-7 h-7 text-white" />
          <span>Registrar Saída para Van</span>
        </Button>
      </div>

      {/* Card de Estoque Consolidado e por Modelo */}
      <EstoqueCard
        resumoTotal={resumoTotal}
        resumoPorModelo={resumoPorModelo}
      />

      {/* Cargas em Processo de Banho */}
      <CardCargasEmBanho
        cargasEmBanho={cargasEmBanho}
        onConcluirBanho={handleConcluirBanho}
      />

      {/* Lista de Lotes Recentes */}
      <TabelaLotesRecentes
        lotes={lotes}
        saidas={saidas}
        onExcluirLote={handleExcluirLote}
      />

      {/* Modais */}
      <ModalNovoLote
        isOpen={modalNovoLoteAberto}
        onClose={() => setModalNovoLoteAberto(false)}
        onSubmit={handleCriarLote}
      />

      <ModalNovaSaida
        isOpen={modalNovaSaidaAberto}
        onClose={() => setModalNovaSaidaAberto(false)}
        lotesDisponiveis={lotesDisponiveis}
        onSubmit={handleCriarSaida}
      />
    </div>
  );
}
