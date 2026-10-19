import React from "react";
import Card from "@/components/ui/Card";
import { SaidaProducao, PedidoVenda, CATALOGO_ARGOLAS } from "@/types/domain";
import { calcularSaldoSaida, calcularEstoqueBanho } from "@/lib/vendas/vendas-engine";

interface CardSaldoRemessasProps {
  saidas: SaidaProducao[];
  pedidos: PedidoVenda[];
}

export const CardSaldoRemessas: React.FC<CardSaldoRemessasProps> = ({
  saidas,
  pedidos,
}) => {
  // Filtra apenas saídas ativas
  const saidasAtivas = saidas.filter((s) => s.ativo);

  // Calcula o saldo disponível consolidado por modelo
  const saldoPorModelo: Record<string, number> = {};
  let totalArgolasLogistica = 0;

  for (const modelo of CATALOGO_ARGOLAS) {
    saldoPorModelo[modelo.id] = 0;
  }

  for (const saida of saidasAtivas) {
    const saldo = calcularSaldoSaida(saida, pedidos);
    saldoPorModelo[saida.modeloId] = (saldoPorModelo[saida.modeloId] || 0) + saldo;
    totalArgolasLogistica += saldo;
  }

  const estoqueBanho = calcularEstoqueBanho(saidas);

  return (
    <div className="space-y-6">
      {/* Card de Destaque Geral */}
      <Card
        className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 border-2 border-blue-500 shadow-lg"
        title="Estoque Pronto para Envio (Logística)"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-2">
          <div>
            <span className="text-xl font-medium text-blue-200">
              Total Disponível nas Remessas:
            </span>
            <div className="text-4xl md:text-5xl font-black text-white mt-1">
              {totalArgolasLogistica.toLocaleString("pt-BR")}{" "}
              <span className="text-2xl font-bold text-blue-300">unidades</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="bg-blue-800/80 px-4 py-3 rounded-xl border border-blue-400/50 text-base font-semibold text-blue-100">
              {saidasAtivas.length} {saidasAtivas.length === 1 ? "remessa ativa" : "remessas ativas"} da van
            </div>
            {estoqueBanho.total > 0 && (
              <div className="bg-amber-500/30 px-4 py-3 rounded-xl border border-amber-400/60 text-base font-bold text-amber-200 flex items-center gap-1.5">
                <span>✨</span>
                <span>{estoqueBanho.total.toLocaleString("pt-BR")} un em Banho</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Grade por Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CATALOGO_ARGOLAS.map((modelo) => {
          const saldo = saldoPorModelo[modelo.id] || 0;
          const temEstoque = saldo > 0;

          return (
            <Card
              key={modelo.id}
              className={`p-4 border-2 transition-colors ${
                temEstoque
                  ? "bg-white border-slate-300"
                  : "bg-slate-50 border-dashed border-slate-300 opacity-75"
              }`}
            >
              <div className="text-lg font-bold text-slate-900 leading-snug">
                {modelo.nome}
              </div>
              <div className="text-sm font-semibold text-slate-500 mt-1">
                {modelo.unidadesPorKgAprox.toLocaleString("pt-BR")} un/kg
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span
                  className={`text-2xl font-black ${
                    temEstoque ? "text-emerald-700" : "text-slate-500"
                  }`}
                >
                  {saldo.toLocaleString("pt-BR")}
                </span>
                <span className="text-sm font-bold text-slate-600">unidades</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CardSaldoRemessas;
