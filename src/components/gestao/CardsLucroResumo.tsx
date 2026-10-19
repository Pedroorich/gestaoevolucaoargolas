import React from 'react';
import { TrendingUp, AlertTriangle, ArrowDownRight, DollarSign, Package } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatBRL } from '@/lib/money';
import { MetricasLucro } from '@/lib/gestao/lucro-engine';

interface CardsLucroResumoProps {
  metricas: MetricasLucro;
}

export const CardsLucroResumo: React.FC<CardsLucroResumoProps> = ({ metricas }) => {
  return (
    <div className="space-y-4">
      {/* Alerta de Lucro/Margem Negativa se houver */}
      {metricas.lucroNegativo && (
        <div
          role="alert"
          className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex items-center gap-3 text-red-900"
        >
          <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-bold">Atenção: Margem Negativa no período selecionado!</p>
            <p className="text-base text-red-800">
              Os custos operacionais e de matéria-prima superaram o faturamento das vendas deste período.
            </p>
          </div>
        </div>
      )}

      {/* Grid com os 3 cartões gigantes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Lucro Líquido Real */}
        <Card
          className={`border-2 ${
            metricas.lucroNegativo
              ? 'border-red-400 bg-red-50/40'
              : 'border-green-500 bg-green-50/30'
          }`}
        >
          <div className="flex items-start justify-between">
            <span className="text-lg font-bold text-gray-700">Lucro Líquido Real</span>
            <div
              className={`p-2.5 rounded-xl ${
                metricas.lucroNegativo ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
              }`}
            >
              {metricas.lucroNegativo ? (
                <ArrowDownRight className="w-6 h-6" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
            </div>
          </div>

          <div className="mt-4">
            <span
              className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
                metricas.lucroNegativo ? 'text-red-700' : 'text-green-800'
              }`}
            >
              {formatBRL(metricas.lucroLiquidoCentavos)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-base font-bold ${
                metricas.lucroNegativo
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              Margem: {metricas.margemPercentual.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">sobre o faturamento</span>
          </div>
        </Card>

        {/* Card 2: Receita de Vendas */}
        <Card className="border-2 border-brand-orange bg-orange-50/20">
          <div className="flex items-start justify-between">
            <span className="text-lg font-bold text-gray-700">Receita Bruta</span>
            <div className="p-2.5 rounded-xl bg-orange-200 text-brand-orange">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-extrabold text-brand-black tracking-tight">
              {formatBRL(metricas.receitaBrutaCentavos)}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-base text-gray-700 font-medium">
            <Package className="w-5 h-5 text-gray-500" />
            <span>
              {metricas.totalUnidadesVendidas.toLocaleString('pt-BR')} argolas vendidas em{' '}
              {metricas.totalPedidos} {metricas.totalPedidos === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
        </Card>

        {/* Card 3: Custos Totais */}
        <Card className="border-2 border-gray-300 bg-white">
          <div className="flex items-start justify-between">
            <span className="text-lg font-bold text-gray-700">Custos Totais</span>
            <div className="p-2.5 rounded-xl bg-gray-100 text-gray-700">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {formatBRL(metricas.custoTotalCentavos)}
            </span>
          </div>

          <div className="mt-3 text-sm text-gray-600 space-y-1 font-medium border-t pt-2">
            <div className="flex justify-between">
              <span>Matéria-prima:</span>
              <span className="font-semibold">{formatBRL(metricas.custoMateriaPrimaCentavos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fretes / Envio:</span>
              <span className="font-semibold">{formatBRL(metricas.custoFreteCentavos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Embalagem & Combustível:</span>
              <span className="font-semibold">
                {formatBRL(metricas.custoEmbalagemCentavos + metricas.custoCombustivelCentavos)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
