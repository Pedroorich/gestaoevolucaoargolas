import React from 'react';
import { Card } from '@/components/ui/Card';
import { formatBRL } from '@/lib/money';
import { DesempenhoModelo } from '@/lib/gestao/lucro-engine';

interface TabelaLucroModelosProps {
  modelos: DesempenhoModelo[];
}

export const TabelaLucroModelos: React.FC<TabelaLucroModelosProps> = ({ modelos }) => {
  return (
    <Card className="border-2 border-gray-200">
      <div className="border-b pb-3 mb-4">
        <h2 className="text-xl md:text-2xl font-extrabold text-brand-black">
          Lucro e Margem por Modelo de Argola
        </h2>
        <p className="text-gray-600 text-base mt-1">
          Acompanhe quais tamanhos e acabamentos estão trazendo maior retorno:
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50 text-gray-700 text-base">
              <th className="py-3 px-4 font-bold">Modelo</th>
              <th className="py-3 px-4 font-bold text-right">Qtd Vendida</th>
              <th className="py-3 px-4 font-bold text-right">Receita</th>
              <th className="py-3 px-4 font-bold text-right">Custo MP</th>
              <th className="py-3 px-4 font-bold text-right">Lucro</th>
              <th className="py-3 px-4 font-bold text-right">Margem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-base text-gray-800">
            {modelos.map((item) => (
              <tr key={item.modeloId} className="hover:bg-gray-50/70 transition-colors">
                <td className="py-3.5 px-4 font-bold text-brand-black">
                  {item.nomeModelo}
                </td>
                <td className="py-3.5 px-4 text-right font-medium">
                  {item.quantidadeVendida > 0
                    ? `${item.quantidadeVendida.toLocaleString('pt-BR')} un`
                    : '-'}
                </td>
                <td className="py-3.5 px-4 text-right font-semibold">
                  {formatBRL(item.receitaCentavos)}
                </td>
                <td className="py-3.5 px-4 text-right text-gray-600">
                  {formatBRL(item.custoMateriaPrimaCentavos)}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-bold ${
                    item.lucroCentavos < 0
                      ? 'text-red-600'
                      : item.lucroCentavos > 0
                      ? 'text-green-800'
                      : 'text-gray-600'
                  }`}
                >
                  {formatBRL(item.lucroCentavos)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-sm ${
                      item.margemPercentual < 0
                        ? 'bg-red-100 text-red-800'
                        : item.margemPercentual > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.margemPercentual > 0 ? `${item.margemPercentual.toFixed(1)}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
