import React, { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { SaidaProducao, CATALOGO_ARGOLAS } from "@/types/domain";

interface CardCargasEmBanhoProps {
  cargasEmBanho: SaidaProducao[];
  onConcluirBanho: (saidaId: string) => Promise<void>;
}

export default function CardCargasEmBanho({
  cargasEmBanho,
  onConcluirBanho,
}: CardCargasEmBanhoProps) {
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  if (!cargasEmBanho || cargasEmBanho.length === 0) {
    return null;
  }

  function getNomeModelo(modeloId: string): string {
    const m = CATALOGO_ARGOLAS.find((item) => item.id === modeloId);
    return m ? m.nome : modeloId;
  }

  async function handleConcluir(saidaId: string) {
    try {
      setProcessandoId(saidaId);
      await onConcluirBanho(saidaId);
    } finally {
      setProcessandoId(null);
    }
  }

  const totalArgolasEmBanho = cargasEmBanho.reduce((acc, c) => acc + c.quantidade, 0);

  return (
    <Card className="bg-amber-50/70 border-2 border-amber-400 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              ✨
            </span>
            <h3 className="text-xl font-black text-amber-950">
              Argolas em Processo de Banho
            </h3>
          </div>
          <p className="text-base font-medium text-amber-900 mt-1">
            Total de{" "}
            <strong>{totalArgolasEmBanho.toLocaleString("pt-BR")} argolas</strong>{" "}
            no processo terceirizado de metalização/banho.
          </p>
        </div>
        <span className="bg-amber-200 text-amber-950 px-3 py-1 rounded-full text-sm font-black self-start sm:self-auto border border-amber-300">
          {cargasEmBanho.length} {cargasEmBanho.length === 1 ? "lote em banho" : "lotes em banho"}
        </span>
      </div>

      <div className="space-y-3">
        {cargasEmBanho.map((carga) => {
          const isProcessing = processandoId === carga.id;
          const dataFormatada = carga.data
            ? new Date(carga.data).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Data n/d";

          return (
            <div
              key={carga.id}
              className="p-4 bg-white border-2 border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-black text-black">
                    {getNomeModelo(carga.modeloId)}
                  </span>
                  <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                    Enviado ao banho em {dataFormatada}
                  </span>
                </div>
                <div className="text-base text-neutral-800">
                  Quantidade:{" "}
                  <strong className="text-black text-lg">
                    {carga.quantidade.toLocaleString("pt-BR")} un
                  </strong>
                </div>
              </div>

              <div>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleConcluir(carga.id)}
                  disabled={isProcessing}
                  className="w-full md:w-auto min-h-[48px] bg-amber-600 hover:bg-amber-700 text-white font-black"
                >
                  {isProcessing
                    ? "Atualizando..."
                    : "Receber do Banho -> Enviar p/ Logística"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
