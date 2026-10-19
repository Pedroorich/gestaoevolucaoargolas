import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { LoteProducao, SaidaProducao, CATALOGO_ARGOLAS } from "@/types/domain";
import { calcularSaldoLote } from "@/lib/producao/estoque";

interface TabelaLotesRecentesProps {
  lotes: LoteProducao[];
  saidas: SaidaProducao[];
  onExcluirLote?: (loteId: string, motivo: string) => Promise<void>;
}

export default function TabelaLotesRecentes({
  lotes,
  saidas,
  onExcluirLote,
}: TabelaLotesRecentesProps) {
  const [loteParaExcluir, setLoteParaExcluir] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(false);

  function getNomeModelo(modeloId: string): string {
    const m = CATALOGO_ARGOLAS.find((item) => item.id === modeloId);
    return m ? m.nome : modeloId;
  }

  function formatarData(data: Date): string {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data));
    } catch {
      return "Data não informada";
    }
  }

  async function handleConfirmarExclusao() {
    if (!loteParaExcluir || !onExcluirLote) return;
    if (!motivo.trim()) {
      alert("Por favor, informe o motivo da exclusão lógica");
      return;
    }

    try {
      setCarregando(true);
      await onExcluirLote(loteParaExcluir, motivo.trim());
      setLoteParaExcluir(null);
      setMotivo("");
    } finally {
      setCarregando(false);
    }
  }

  const lotesAtivos = lotes.filter((l) => l.ativo);

  return (
    <Card className="bg-white border-2 border-black/10">
      <h3 className="text-xl font-black text-black mb-4">
        Lotes Produzidos Recentemente
      </h3>

      {lotesAtivos.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 font-medium">
          Nenhum lote registrado até o momento. Toque no botão acima para lançar o primeiro lote.
        </div>
      ) : (
        <div className="space-y-4">
          {lotesAtivos.map((lote) => {
            const saldo = calcularSaldoLote(lote, saidas);
            const totalSaidasLote = saidas
              .filter((s) => s.ativo && s.loteId === lote.id)
              .reduce((acc, s) => acc + s.quantidade, 0);

            return (
              <div
                key={lote.id}
                className="p-4 border-2 border-neutral-200 rounded-xl bg-neutral-50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-lg text-black">
                      {getNomeModelo(lote.modeloId)}
                    </span>
                    <span className="text-xs bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full font-bold">
                      Lote {lote.id.slice(0, 6)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatarData(lote.data)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-base pt-1">
                    <span className="text-neutral-700">
                      Fabricado:{" "}
                      <strong className="text-black">
                        {lote.quantidadeProduzida.toLocaleString("pt-BR")} un
                        {lote.pesoKg ? ` (${lote.pesoKg} kg)` : ""}
                      </strong>
                    </span>
                    <span className="text-neutral-700">
                      Defeitos/Perdas:{" "}
                      <strong className="text-red-700">
                        {lote.perdas.toLocaleString("pt-BR")}
                      </strong>
                    </span>
                    <span className="text-neutral-700">
                      Enviado na Van:{" "}
                      <strong className="text-blue-700">
                        {totalSaidasLote.toLocaleString("pt-BR")}
                      </strong>
                    </span>
                    <span className="text-neutral-900 font-bold bg-white px-2 py-0.5 rounded border border-neutral-300">
                      Saldo restante:{" "}
                      <span className="text-primary-orange font-black">
                        {saldo.toLocaleString("pt-BR")}
                      </span>
                    </span>
                  </div>

                  {lote.observacoes && (
                    <p className="text-sm text-neutral-600 italic pt-1">
                      Obs: {lote.observacoes}
                    </p>
                  )}
                </div>

                {onExcluirLote && (
                  <div className="flex-shrink-0 pt-2 md:pt-0">
                    {totalSaidasLote > 0 ? (
                      <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-3 py-3 rounded-xl font-bold inline-block min-h-[48px] flex items-center">
                        🔒 Bloqueado (Argolas já enviadas na Van)
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setLoteParaExcluir(lote.id)}
                        className="text-sm min-h-[48px] text-red-700 hover:bg-red-50 border-red-200"
                      >
                        Excluir Lote
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de exclusão lógica */}
      {loteParaExcluir && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-black border-2 border-red-500">
            <h3 className="text-xl font-black text-red-700 mb-2">
              Confirmar Exclusão de Lote
            </h3>
            <p className="text-base text-neutral-700 mb-4">
              O lote será desativado e não contará mais no estoque. Esta ação fica registrada no histórico de auditoria.
            </p>

            <div className="mb-4">
              <label
                htmlFor="motivoExclusao"
                className="block font-bold text-sm mb-1"
              >
                Motivo da exclusão (obrigatório)
              </label>
              <input
                id="motivoExclusao"
                type="text"
                required
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Lote lançado com quantidade duplicada"
                className="w-full min-h-[48px] px-3 py-2 border-2 border-neutral-300 rounded-lg text-base"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setLoteParaExcluir(null);
                  setMotivo("");
                }}
                disabled={carregando}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmarExclusao}
                disabled={carregando || !motivo.trim()}
              >
                {carregando ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
