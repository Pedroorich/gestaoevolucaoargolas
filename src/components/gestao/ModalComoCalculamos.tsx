import React from 'react';
import { X, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ModalComoCalculamosProps {
  aberto: boolean;
  onFechar: () => void;
}

export const ModalComoCalculamos: React.FC<ModalComoCalculamosProps> = ({
  aberto,
  onFechar,
}) => {
  if (!aberto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-calculo-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border-2 border-gray-300 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-brand-blue" />
            <h2
              id="modal-calculo-titulo"
              className="text-2xl font-extrabold text-brand-black"
            >
              Como calculamos o lucro?
            </h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar modal"
            className="p-2 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4 text-base md:text-lg text-gray-800 leading-relaxed">
          <p>
            O <strong>Lucro Líquido Real</strong> é calculado subtraindo todos os custos
            diretos e operacionais do total bruto faturado nas vendas:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 font-mono text-base text-blue-950">
            <strong>Lucro Líquido</strong> = Receita Total de Vendas - (Matéria-prima + Frete
            Terceirizado + Embalagens + Combustível da Van)
          </div>

          <div className="space-y-2.5">
            <h3 className="font-bold text-gray-900 text-lg">O que entra em cada parte:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
                <span>
                  <strong>Receita Bruta:</strong> Valor total cobrado dos clientes nos pedidos
                  entregues ou faturados.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
                <span>
                  <strong>Matéria-prima:</strong> Custo do arame e insumos utilizados na
                  fabricação das argolas que foram vendidas.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
                <span>
                  <strong>Frete Terceirizado:</strong> Custos de entregas feitas via Lalamove,
                  Correios ou transportadoras.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 shrink-0" />
                <span>
                  <strong>Embalagem & Combustível:</strong> Sacos plásticos, caixas e o combustível
                  utilizado na van própria para distribuição.
                </span>
              </li>
            </ul>
          </div>

          <p className="text-gray-600 text-sm">
            Todos os cálculos são feitos com precisão em centavos inteiros, sem arredondamentos
            prejudiciais ao caixa.
          </p>
        </div>

        <div className="pt-3 border-t">
          <Button
            variant="primary"
            onClick={onFechar}
            className="w-full text-lg py-3 min-h-[48px]"
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};
