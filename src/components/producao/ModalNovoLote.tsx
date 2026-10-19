import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { CATALOGO_ARGOLAS } from "@/types/domain";
import { validarNovoLote } from "@/lib/producao/estoque";
import { parseBRLInputToCents } from "@/lib/money";

interface ModalNovoLoteProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dados: {
    modeloId: string;
    quantidadeProduzida?: number;
    pesoKg?: number | null;
    perdas: number;
    observacoes?: string;
    custoMaterialCentavos?: number;
  }) => Promise<void>;
}

export default function ModalNovoLote({
  isOpen,
  onClose,
  onSubmit,
}: ModalNovoLoteProps) {
  const [modeloId, setModeloId] = useState<string>(CATALOGO_ARGOLAS[0]?.id || "");
  const [quantidade, setQuantidade] = useState<string>("");
  const [pesoKg, setPesoKg] = useState<string>("");
  const [perdas, setPerdas] = useState<string>("0");
  const [custoReais, setCustoReais] = useState<string>("");
  const [observacoes, setObservacoes] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);

  if (!isOpen) return null;

  const modeloSelecionado = CATALOGO_ARGOLAS.find((m) => m.id === modeloId);
  const densidade = modeloSelecionado?.unidadesPorKgAprox || 0;

  const pesoNum = pesoKg.trim() !== "" ? parseFloat(pesoKg.replace(',', '.')) : NaN;
  const qtdNum = quantidade.trim() !== "" ? parseInt(quantidade, 10) : NaN;

  const estimativaUnidades =
    !isNaN(pesoNum) && pesoNum > 0 && densidade > 0
      ? Math.round(pesoNum * densidade)
      : null;

  const estimativaKg =
    !isNaN(qtdNum) && qtdNum > 0 && densidade > 0
      ? Number((qtdNum / densidade).toFixed(2))
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const qtdVal = !isNaN(qtdNum) && qtdNum > 0 ? qtdNum : undefined;
    const pesoVal = !isNaN(pesoNum) && pesoNum > 0 ? pesoNum : undefined;

    if (pesoKg.trim() !== "" && (isNaN(pesoNum) || pesoNum <= 0)) {
      setErro("Informe um peso em quilos válido maior que zero");
      return;
    }

    const perdasNum = perdas.trim() === "" ? 0 : Number(perdas);

    const validacao = validarNovoLote({
      modeloId,
      quantidadeProduzida: qtdVal,
      pesoKg: pesoVal,
      perdas: perdasNum,
    });

    if (!validacao.valido) {
      setErro(validacao.erro || "Dados inválidos");
      return;
    }

    let custoCentavos: number | undefined = undefined;
    if (custoReais.trim() !== "") {
      try {
        custoCentavos = parseBRLInputToCents(custoReais);
      } catch {
        setErro("Valor de custo inválido");
        return;
      }
    }

    try {
      setCarregando(true);
      await onSubmit({
        modeloId,
        quantidadeProduzida: validacao.quantidadeProduzidaFinal,
        pesoKg: validacao.pesoKgFinal,
        perdas: perdasNum,
        observacoes: observacoes.trim() || undefined,
        custoMaterialCentavos: custoCentavos,
      });
      // Limpa formulário e fecha
      setQuantidade("");
      setPesoKg("");
      setPerdas("0");
      setCustoReais("");
      setObservacoes("");
      onClose();
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar lote");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-lote"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-black border-2 border-black/10">
        <h2 id="titulo-modal-lote" className="text-2xl font-black mb-4">
          Registrar Novo Lote
        </h2>

        {erro && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-100 border-l-4 border-red-600 text-red-900 rounded font-medium text-base"
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modeloArgola"
              className="block font-bold text-base mb-1"
            >
              Modelo da argola
            </label>
            <select
              id="modeloArgola"
              value={modeloId}
              onChange={(e) => setModeloId(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 text-base border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange bg-white font-medium"
            >
              {CATALOGO_ARGOLAS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.descricao})
                </option>
              ))}
            </select>
          </div>

          {/* Seção Volume: Unidades OU Quilos (kg) */}
          <div className="bg-orange-50/70 p-4 rounded-xl border border-brand-orange/40 space-y-3">
            <span className="text-sm font-extrabold text-neutral-900 uppercase tracking-wide block">
              Volume da Fabricação (Preencha ao menos um)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="quantidadeFabricada"
                  className="block font-bold text-base mb-1"
                >
                  Quantidade fabricada (unidades)
                </label>
                <input
                  id="quantidadeFabricada"
                  type="number"
                  min="1"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex: 5000"
                  className="w-full min-h-[48px] px-3 py-2 text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange font-bold bg-white"
                />
                {estimativaKg && !pesoKg && (
                  <p className="text-xs text-neutral-600 mt-1 font-medium">
                    ≈ {estimativaKg} kg estimado
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pesoKgFabricado"
                  className="block font-bold text-base mb-1"
                >
                  Peso em quilos (kg)
                </label>
                <input
                  id="pesoKgFabricado"
                  type="text"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  placeholder="Ex: 5,5 ou 10"
                  className="w-full min-h-[48px] px-3 py-2 text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange font-bold bg-white"
                />
                {estimativaUnidades && !quantidade && (
                  <p className="text-xs text-brand-orange mt-1 font-bold">
                    ≈ {estimativaUnidades.toLocaleString('pt-BR')} argolas estimadas
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-600">
              * Se não souber a quantidade exata de argolas, digite apenas os quilos (kg). O sistema calcula as unidades automaticamente.
            </p>
          </div>

          <div>
            <label
              htmlFor="argolasComDefeito"
              className="block font-bold text-base mb-1"
            >
              Argolas com defeito / perdas (unidades)
            </label>
            <input
              id="argolasComDefeito"
              type="number"
              min="0"
              step="1"
              value={perdas}
              onChange={(e) => setPerdas(e.target.value)}
              className="w-full min-h-[48px] px-3 py-2 text-lg border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange font-bold text-red-700"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Argolas amassadas ou descartadas durante a fabricação.
            </p>
          </div>

          <div>
            <label
              htmlFor="custoArame"
              className="block font-bold text-base mb-1"
            >
              Custo do arame deste lote (opcional, em R$)
            </label>
            <input
              id="custoArame"
              type="text"
              value={custoReais}
              onChange={(e) => setCustoReais(e.target.value)}
              placeholder="Ex: 450,00"
              className="w-full min-h-[48px] px-3 py-2 text-base border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div>
            <label
              htmlFor="observacoesLote"
              className="block font-bold text-base mb-1"
            >
              Observações
            </label>
            <textarea
              id="observacoesLote"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Arame do fornecedor X, regulagem nova da máquina..."
              className="w-full px-3 py-2 text-base border-2 border-neutral-300 rounded-lg focus:outline-none focus:border-brand-orange"
            />
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
              {carregando ? "Salvando..." : "Salvar Lote"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
