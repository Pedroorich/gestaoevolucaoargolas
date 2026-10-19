import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { LoteProducao, CATALOGO_ARGOLAS } from "@/types/domain";
import { validarNovaSaida } from "@/lib/producao/estoque";

interface LoteDisponivelItem {
  lote: LoteProducao;
  saldoDisponivel: number;
}

interface ModalNovaSaidaProps {
  isOpen: boolean;
  onClose: () => void;
  lotesDisponiveis: LoteDisponivelItem[];
  onSubmit: (dados: {
    loteId: string;
    modeloId: string;
    quantidade: number;
    transporte: "van_propria" | "lalamove" | "correios" | "outro";
    destino: "centro_logistica" | "banho";
  }) => Promise<void>;
}

export default function ModalNovaSaida({
  isOpen,
  onClose,
  lotesDisponiveis,
  onSubmit,
}: ModalNovaSaidaProps) {
  const lotesComSaldo = lotesDisponiveis.filter((item) => item.saldoDisponivel > 0);

  const [loteIdSelecionado, setLoteIdSelecionado] = useState<string>(
    lotesComSaldo[0]?.lote.id || ""
  );
  const [quantidade, setQuantidade] = useState<string>("");
  const [transporte, setTransporte] = useState<
    "van_propria" | "lalamove" | "correios" | "outro"
  >("van_propria");
  const [destino, setDestino] = useState<"centro_logistica" | "banho">("centro_logistica");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  useEffect(() => {
    if (lotesComSaldo.length > 0 && !loteIdSelecionado) {
      setLoteIdSelecionado(lotesComSaldo[0].lote.id);
    }
  }, [lotesComSaldo, loteIdSelecionado]);

  if (!isOpen) return null;

  const itemSelecionado = lotesDisponiveis.find(
    (item) => item.lote.id === loteIdSelecionado
  );
  const saldoAtual = itemSelecionado ? itemSelecionado.saldoDisponivel : 0;
  const qtdNum = Number(quantidade) || 0;
  const saldoRestante = Math.max(0, saldoAtual - qtdNum);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const qtdSubmissao = Number(quantidade);

    if (!itemSelecionado) {
      setErro("Selecione um lote válido com saldo disponível");
      return;
    }

    const validacao = validarNovaSaida({
      loteId: itemSelecionado.lote.id,
      quantidade: qtdSubmissao,
      saldoDisponivel: saldoAtual,
    });

    if (!validacao.valido) {
      setErro(validacao.erro || "Dados inválidos para saída");
      return;
    }

    try {
      setCarregando(true);
      await onSubmit({
        loteId: itemSelecionado.lote.id,
        modeloId: itemSelecionado.lote.modeloId,
        quantidade: qtdSubmissao,
        transporte,
        destino,
      });
      setQuantidade("");
      setDestino("centro_logistica");
      onClose();
    } catch (err: any) {
      setErro(err?.message || "Erro ao registrar saída");
    } finally {
      setCarregando(false);
    }
  }

  function getNomeModelo(modeloId: string): string {
    const m = CATALOGO_ARGOLAS.find((item) => item.id === modeloId);
    return m ? m.nome : modeloId;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-saida"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-black border-2 border-black/10">
        <h2 id="titulo-modal-saida" className="text-2xl font-black mb-4">
          Colocar Argolas na Van
        </h2>

        {erro && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 text-red-900 rounded font-medium text-base"
          >
            {erro}
          </div>
        )}

        {lotesComSaldo.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-lg font-bold text-neutral-700">
              Não há lotes com saldo disponível para envio no momento.
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Cadastre um novo lote produzido antes de registrar uma saída.
            </p>
            <div className="mt-6">
              <Button type="button" variant="secondary" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="loteOrigem"
                className="block font-bold text-base mb-1"
              >
                Selecione o lote de origem
              </label>
              <select
                id="loteOrigem"
                value={loteIdSelecionado}
                onChange={(e) => setLoteIdSelecionado(e.target.value)}
                className="w-full min-h-[48px] px-3 py-2 text-base border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-primary-orange bg-white font-medium"
              >
                {lotesComSaldo.map(({ lote, saldoDisponivel }) => (
                  <option key={lote.id} value={lote.id}>
                    {getNomeModelo(lote.modeloId)} — Saldo: {saldoDisponivel.toLocaleString("pt-BR")} argolas (Lote {lote.id.slice(0, 6)})
                  </option>
                ))}
              </select>
            </div>

            {itemSelecionado && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                <span className="font-bold block text-base">
                  Saldo disponível neste lote: {saldoAtual.toLocaleString("pt-BR")} unidades
                </span>
                <span>
                  Modelo: {getNomeModelo(itemSelecionado.lote.modeloId)}
                </span>
              </div>
            )}

            <div>
              <label
                htmlFor="quantidadeSaida"
                className="block font-bold text-base mb-1"
              >
                Quantidade para colocar na van (unidades)
              </label>
              <input
                id="quantidadeSaida"
                type="number"
                min="1"
                max={saldoAtual}
                step="1"
                required
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="Ex: 2000"
                className="w-full min-h-[48px] px-3 py-2 text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-primary-orange font-bold text-blue-800"
              />
              {qtdNum > 0 && (
                <p className="text-sm font-semibold text-neutral-600 mt-1">
                  Saldo restante após o carregamento: {saldoRestante.toLocaleString("pt-BR")} argolas.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="meioTransporte"
                className="block font-bold text-base mb-1"
              >
                Meio de transporte
              </label>
              <select
                id="meioTransporte"
                value={transporte}
                onChange={(e) => setTransporte(e.target.value as any)}
                className="w-full min-h-[48px] px-3 py-2 text-base border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-primary-orange bg-white font-medium"
              >
                <option value="van_propria">🚐 Van Própria da Empresa</option>
                <option value="lalamove">🛵 Lalamove (Entrega Rápida)</option>
                <option value="correios">📦 Correios / Sedex</option>
                <option value="outro">Outro Transporte</option>
              </select>
            </div>

            {/* Destino da Carga: Centro de Logística vs Banho */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <label className="block font-bold text-base text-black">
                Para onde esta carga está sendo levada?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    destino === "centro_logistica"
                      ? "border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-sm"
                      : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="destinoCarga"
                    value="centro_logistica"
                    checked={destino === "centro_logistica"}
                    onChange={() => setDestino("centro_logistica")}
                    className="mt-1 w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className="block text-base leading-tight font-black">
                      🏢 Centro de Logística
                    </span>
                    <span className="block text-xs font-normal text-neutral-600 mt-1">
                      Fica imediatamente pronto para vendas e entregas na van.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    destino === "banho"
                      ? "border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-sm"
                      : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="destinoCarga"
                    value="banho"
                    checked={destino === "banho"}
                    onChange={() => setDestino("banho")}
                    className="mt-1 w-5 h-5 accent-amber-600 cursor-pointer"
                  />
                  <div>
                    <span className="block text-base leading-tight font-black">
                      ✨ Banho / Metalização
                    </span>
                    <span className="block text-xs font-normal text-neutral-600 mt-1">
                      Enviado para galvanoplastia. Não liberado p/ venda até o retorno.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={carregando}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={carregando}
                className="w-full sm:w-auto"
              >
                {carregando ? "Registrando..." : "Confirmar Envio"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
