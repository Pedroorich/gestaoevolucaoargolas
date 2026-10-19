'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, HelpCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { listarPedidosVendas } from '@/lib/firebase/vendas-service';
import { PedidoVenda } from '@/types/domain';
import {
  calcularMetricasLucro,
  filtrarPorPeriodo,
  PeriodoFiltro,
} from '@/lib/gestao/lucro-engine';
import { CardsLucroResumo } from '@/components/gestao/CardsLucroResumo';
import { TabelaLucroModelos } from '@/components/gestao/TabelaLucroModelos';
import { ModalComoCalculamos } from '@/components/gestao/ModalComoCalculamos';

export default function PainelLucroPage() {
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes');
  const [modalAjudaAberto, setModalAjudaAberto] = useState(false);

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const lista = await listarPedidosVendas();
      setPedidos(lista);
    } catch (err) {
      console.error('Erro ao carregar pedidos para painel de lucro:', err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const pedidosFiltrados = filtrarPorPeriodo(pedidos, periodo);
  const metricas = calcularMetricasLucro(pedidosFiltrados);

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
              Painel de Lucro
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Faturamento, custos detalhados e margem líquida real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setModalAjudaAberto(true)}
            className="flex items-center gap-2 text-base min-h-[48px] border-blue-600 text-brand-blue hover:bg-blue-50"
          >
            <HelpCircle className="w-5 h-5" />
            Como calculamos?
          </Button>

          <Button
            variant="secondary"
            onClick={carregarDados}
            disabled={carregando}
            aria-label="Atualizar dados"
            className="p-3 min-h-[48px] min-w-[48px] flex items-center justify-center border-gray-300"
          >
            <RefreshCw className={`w-5 h-5 text-gray-700 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Seletor de Período Rápido */}
      <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-2 rounded-2xl">
        <span className="text-base font-bold text-gray-700 px-3">Filtrar período:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all min-h-[48px] ${
              periodo === 'hoje'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('semana')}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all min-h-[48px] ${
              periodo === 'semana'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setPeriodo('mes')}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all min-h-[48px] ${
              periodo === 'mes'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-4 py-2.5 rounded-xl text-base font-bold transition-all min-h-[48px] ${
              periodo === 'todos'
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            Todo o Período
          </button>
        </div>
      </div>

      {/* Cartões de Métricas Consolidadas */}
      <CardsLucroResumo metricas={metricas} />

      {/* Detalhamento por Modelo */}
      <TabelaLucroModelos modelos={metricas.desempenhoPorModelo} />

      {/* Modal explicativo */}
      <ModalComoCalculamos
        aberto={modalAjudaAberto}
        onFechar={() => setModalAjudaAberto(false)}
      />
    </div>
  );
}
