import React from "react";
import Card from "@/components/ui/Card";
import { CATALOGO_ARGOLAS } from "@/types/domain";
import { EstoqueModeloResumo } from "@/lib/producao/estoque";

interface EstoqueCardProps {
  resumoTotal: EstoqueModeloResumo;
  resumoPorModelo: Record<string, EstoqueModeloResumo>;
  onVerDetalhes?: () => void;
}

export default function EstoqueCard({
  resumoTotal,
  resumoPorModelo,
  onVerDetalhes,
}: EstoqueCardProps) {
  return (
    <Card className="bg-white border-2 border-black/10 shadow-md">
      {/* Total em destaque principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-2">
        <div>
          <span className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Estoque no Centro de Produção
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl md:text-5xl font-black text-black">
              {resumoTotal.disponivel.toLocaleString("pt-BR")}
            </span>
            <span className="text-lg md:text-xl font-bold text-neutral-600">
              argolas prontas no estoque
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-base text-neutral-700 bg-neutral-100 p-3 rounded-lg mt-2 md:mt-0">
          <div>
            <span className="text-xs text-neutral-500 block">Total Fabricado</span>
            <span className="font-bold">{resumoTotal.produzido.toLocaleString("pt-BR")}</span>
          </div>
          <div>
            <span className="text-xs text-neutral-500 block">Perdas (Defeitos)</span>
            <span className="font-bold text-red-700">{resumoTotal.perdas.toLocaleString("pt-BR")}</span>
          </div>
          <div>
            <span className="text-xs text-neutral-500 block">Enviado na Van</span>
            <span className="font-bold text-blue-700">{resumoTotal.enviado.toLocaleString("pt-BR")}</span>
          </div>
        </div>
      </div>

      {/* Grade com os modelos */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-black mb-3">
          Saldo Disponível por Modelo de Argola
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATALOGO_ARGOLAS.map((modelo) => {
            const resumo = resumoPorModelo[modelo.id] || { disponivel: 0 };
            return (
              <div
                key={modelo.id}
                className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-base text-black">{modelo.nome}</p>
                  <p className="text-xs text-neutral-500">{modelo.descricao}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-black block">
                    {resumo.disponivel.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-xs text-neutral-500">unidades</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {onVerDetalhes && (
        <div className="mt-4 pt-3 border-t text-right">
          <button
            onClick={onVerDetalhes}
            className="text-primary-blue font-bold text-base hover:underline min-h-[48px] px-2 inline-flex items-center"
          >
            Ver histórico detalhado de lotes →
          </button>
        </div>
      )}
    </Card>
  );
}
