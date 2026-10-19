import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { PedidoVenda, SituacaoPedido } from "@/types/domain";
import { formatCentsToBRL } from "@/lib/money";

interface TabelaPedidosVendasProps {
  pedidos: PedidoVenda[];
  onAtualizarSituacao: (pedidoId: string, novaSituacao: SituacaoPedido) => Promise<void>;
  onExcluirPedido: (pedidoId: string) => Promise<void>;
}

const BADGES_SITUACAO: Record<
  SituacaoPedido,
  { label: string; bg: string; text: string; border: string }
> = {
  pendente: {
    label: "Pendente",
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-400",
  },
  separado: {
    label: "Separado",
    bg: "bg-blue-100",
    text: "text-blue-900",
    border: "border-blue-400",
  },
  enviado: {
    label: "Enviado",
    bg: "bg-purple-100",
    text: "text-purple-900",
    border: "border-purple-400",
  },
  entregue: {
    label: "Entregue",
    bg: "bg-emerald-100",
    text: "text-emerald-900",
    border: "border-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    bg: "bg-red-100",
    text: "text-red-900",
    border: "border-red-400",
  },
};

export const TabelaPedidosVendas: React.FC<TabelaPedidosVendasProps> = ({
  pedidos,
  onAtualizarSituacao,
  onExcluirPedido,
}) => {
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<PedidoVenda | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  const handleMudarSituacao = async (pedidoId: string, novaSituacao: SituacaoPedido) => {
    try {
      setAtualizandoId(pedidoId);
      await onAtualizarSituacao(pedidoId, novaSituacao);
    } finally {
      setAtualizandoId(null);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!pedidoParaExcluir) return;
    try {
      setAtualizandoId(pedidoParaExcluir.id);
      await onExcluirPedido(pedidoParaExcluir.id);
      setPedidoParaExcluir(null);
    } finally {
      setAtualizandoId(null);
    }
  };

  if (pedidos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 text-center">
        <p className="text-xl font-bold text-slate-700">
          Nenhum pedido de venda registrado no momento.
        </p>
        <p className="text-base text-slate-500 mt-1">
          Clique no botão "Novo Pedido" para lançar uma entrega ou venda.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" role="table">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-900 text-lg font-black">
                <th scope="col" className="p-4">
                  Pedido
                </th>
                <th scope="col" className="p-4">
                  Cliente
                </th>
                <th scope="col" className="p-4">
                  Argolas
                </th>
                <th scope="col" className="p-4">
                  Envio
                </th>
                <th scope="col" className="p-4">
                  Valor Total
                </th>
                <th scope="col" className="p-4">
                  Situação
                </th>
                <th scope="col" className="p-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800 text-base font-medium">
              {pedidos.map((pedido) => {
                const badge = BADGES_SITUACAO[pedido.situacao] || BADGES_SITUACAO.pendente;
                const estaProcessando = atualizandoId === pedido.id;

                const dataFormatada =
                  pedido.data instanceof Date
                    ? pedido.data.toLocaleDateString("pt-BR")
                    : String(pedido.data || "");

                return (
                  <tr key={pedido.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-lg text-slate-900">
                      <div>#{pedido.numeroPedido}</div>
                      <div className="text-sm font-semibold text-slate-500">
                        {dataFormatada}
                      </div>
                    </td>

                    <td className="p-4 font-bold text-lg text-slate-900">
                      <div>{pedido.clienteNome}</div>
                      {pedido.enderecoEntrega && (
                        <div className="text-sm font-semibold text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>📍 {pedido.enderecoEntrega}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              pedido.enderecoEntrega
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-300 transition-colors"
                            title="Abrir rota no Google Maps / Waze"
                          >
                            🗺️ Rota GPS
                          </a>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-lg text-slate-900">
                        {pedido.totalUnidades.toLocaleString("pt-BR")} un
                      </div>
                      <div className="text-sm font-semibold text-slate-500">
                        {pedido.itens.length}{" "}
                        {pedido.itens.length === 1 ? "item" : "itens"}
                      </div>
                    </td>

                    <td className="p-4 capitalize">
                      <span className="font-semibold text-lg text-slate-800">
                        {pedido.tipoEnvio}
                      </span>
                      {pedido.custoFreteCentavos > 0 && (
                        <div className="text-sm font-semibold text-slate-500">
                          Frete: {formatCentsToBRL(pedido.custoFreteCentavos)}
                        </div>
                      )}
                    </td>

                    <td className="p-4 font-black text-xl text-slate-950">
                      {formatCentsToBRL(pedido.totalPedidoCentavos)}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-block px-3 py-1.5 rounded-full text-base font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {pedido.situacao !== "entregue" && pedido.situacao !== "cancelada" && (
                          <Button
                            type="button"
                            variant="primary"
                            disabled={estaProcessando}
                            onClick={() => handleMudarSituacao(pedido.id, "entregue")}
                            className="min-h-[48px] px-4 py-2 text-base font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
                          >
                            Marcar como Entregue
                          </Button>
                        )}

                        <select
                          value={pedido.situacao}
                          disabled={estaProcessando}
                          onChange={(e) =>
                            handleMudarSituacao(
                              pedido.id,
                              e.target.value as SituacaoPedido
                            )
                          }
                          aria-label={`Alterar situação do pedido #${pedido.numeroPedido}`}
                          className="min-h-[48px] px-3 py-2 text-base font-bold border-2 border-slate-300 rounded-lg bg-white"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="separado">Separado</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelada">Cancelada</option>
                        </select>

                        {pedido.situacao !== "entregue" && (
                          <button
                            type="button"
                            onClick={() => setPedidoParaExcluir(pedido)}
                            disabled={estaProcessando}
                            className="min-h-[48px] min-w-[48px] px-3 py-2 text-red-700 hover:text-red-900 font-bold text-base rounded-lg hover:bg-red-50"
                            aria-label={`Excluir pedido #${pedido.numeroPedido}`}
                          >
                            Excluir Pedido
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Cancelamento / Exclusão Lógica */}
      {pedidoParaExcluir && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full border-4 border-red-400 space-y-4 shadow-2xl">
            <h3 className="text-2xl font-black text-red-900">
              Tem certeza que deseja cancelar/excluir este pedido?
            </h3>
            <p className="text-lg text-slate-700">
              O pedido <strong>#{pedidoParaExcluir.numeroPedido}</strong> do cliente{" "}
              <strong>{pedidoParaExcluir.clienteNome}</strong> será cancelado logicamente,
              e o saldo das argolas voltará a ficar disponível para outras vendas.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPedidoParaExcluir(null)}
                className="w-full sm:w-auto min-h-[48px] text-lg font-bold"
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmarExclusao}
                className="w-full sm:w-auto min-h-[48px] text-lg font-black bg-red-700 hover:bg-red-800 text-white"
              >
                Sim, Cancelar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TabelaPedidosVendas;
