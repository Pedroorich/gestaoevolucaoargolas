import React, { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import {
  SaidaProducao,
  PedidoVenda,
  CATALOGO_ARGOLAS,
  TipoEnvio,
} from "@/types/domain";
import { NovoPedidoInput } from "@/lib/firebase/vendas-service";
import {
  calcularSaldoSaida,
  converterKgParaUnidades,
  calcularTotaisPedido,
  validarItemPedido,
  validarPedidoCompleto,
} from "@/lib/vendas/vendas-engine";
import { parseBRLInputToCents, formatCentsToBRL } from "@/lib/money";

function safeParseCents(val: string): number {
  if (!val || !val.trim()) return 0;
  try {
    return parseBRLInputToCents(val);
  } catch {
    return 0;
  }
}

interface ItemFormState {
  id: string;
  modeloId: string;
  saidaId: string;
  tipoUnidade: "unidades" | "kg";
  quantidade: string;
  precoBRL: string;
}

interface ModalNovoPedidoProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pedido: NovoPedidoInput) => Promise<void>;
  saidasDisponiveis: SaidaProducao[];
  pedidosExistentes: PedidoVenda[];
  clientes: Array<{ id: string; nome: string; cidade: string; telefone: string; endereco?: string }>;
  onCadastrarClienteRapido: (dados: {
    nome: string;
    telefone: string;
    cidade: string;
    endereco?: string;
  }) => Promise<string>;
  usuarioId?: string;
}

export const ModalNovoPedido: React.FC<ModalNovoPedidoProps> = ({
  isOpen,
  onClose,
  onSubmit,
  saidasDisponiveis,
  pedidosExistentes,
  clientes,
  onCadastrarClienteRapido,
  usuarioId = "usuario-logistica",
}) => {
  const [clienteId, setClienteId] = useState("");
  const [novoClienteModo, setNovoClienteModo] = useState(false);
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");
  const [novoClienteCidade, setNovoClienteCidade] = useState("");
  const [novoClienteEndereco, setNovoClienteEndereco] = useState("");
  const [enderecoEntrega, setEnderecoEntrega] = useState("");

  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>("lalamove");
  const [freteBRL, setFreteBRL] = useState("0,00");
  const [embalagemBRL, setEmbalagemBRL] = useState("0,00");
  const [combustivelBRL, setCombustivelBRL] = useState("0,00");
  const [observacoes, setObservacoes] = useState("");

  const [itens, setItens] = useState<ItemFormState[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Calcula saldos de cada saída ativa
  const saidasComSaldo = saidasDisponiveis
    .filter((s) => s.ativo)
    .map((s) => ({
      ...s,
      saldoDisponivel: calcularSaldoSaida(s, pedidosExistentes),
    }));

  // Inicializa o primeiro item ao abrir
  useEffect(() => {
    if (isOpen) {
      setErro(null);
      setSalvando(false);
      setNovoClienteModo(false);
      setNovoClienteNome("");
      setNovoClienteTelefone("");
      setNovoClienteCidade("");
      setNovoClienteEndereco("");
      setEnderecoEntrega("");
      setTipoEnvio("lalamove");
      setFreteBRL("0,00");
      setEmbalagemBRL("0,00");
      setCombustivelBRL("0,00");
      setObservacoes("");

      const primeiraSaida = saidasComSaldo.find((s) => s.saldoDisponivel > 0);
      const primeiroModelo = primeiraSaida ? primeiraSaida.modeloId : CATALOGO_ARGOLAS[0].id;
      const saidaIdPadrao = primeiraSaida ? primeiraSaida.id : "";

      setItens([
        {
          id: "item-1",
          modeloId: primeiroModelo,
          saidaId: saidaIdPadrao,
          tipoUnidade: "unidades",
          quantidade: "",
          precoBRL: "",
        },
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdicionarItem = () => {
    const primeiraSaida = saidasComSaldo.find((s) => s.saldoDisponivel > 0);
    const novoModelo = primeiraSaida ? primeiraSaida.modeloId : CATALOGO_ARGOLAS[0].id;
    const novaSaidaId = primeiraSaida ? primeiraSaida.id : "";

    setItens((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        modeloId: novoModelo,
        saidaId: novaSaidaId,
        tipoUnidade: "unidades",
        quantidade: "",
        precoBRL: "",
      },
    ]);
  };

  const handleRemoverItem = (id: string) => {
    if (itens.length === 1) {
      setErro("O pedido deve ter pelo menos um item.");
      return;
    }
    setItens((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAtualizarItem = (
    id: string,
    campo: keyof ItemFormState,
    valor: any
  ) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const atualizado = { ...item, [campo]: valor };

        // Se alterou o modelo, tenta atualizar a saída automaticamente para uma com saldo
        if (campo === "modeloId") {
          const saidaDoModelo = saidasComSaldo.find(
            (s) => s.modeloId === valor && s.saldoDisponivel > 0
          );
          atualizado.saidaId = saidaDoModelo ? saidaDoModelo.id : "";
        }
        return atualizado;
      })
    );
  };

  // Cálculo ao vivo dos totais
  const itensCalculados = itens.map((item) => {
    const precoCentavos = safeParseCents(item.precoBRL);
    const qtdNum = Number(item.quantidade) || 0;
    let unidadesCalculadas = 0;

    if (item.tipoUnidade === "unidades") {
      unidadesCalculadas = Math.round(qtdNum);
    } else {
      try {
        unidadesCalculadas = converterKgParaUnidades(item.modeloId, qtdNum);
      } catch {
        unidadesCalculadas = 0;
      }
    }

    return {
      quantidadeUnidades: unidadesCalculadas,
      precoCentavos,
    };
  });

  const freteCentavos = safeParseCents(freteBRL);
  const embalagemCentavos = safeParseCents(embalagemBRL);
  const combustivelCentavos = safeParseCents(combustivelBRL);

  const totaisAoVivo = calcularTotaisPedido(itensCalculados, freteCentavos);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    let clienteFinalId = clienteId;
    let clienteFinalNome = "";

    // Cadastro rápido de cliente se estiver em modo novo
    if (novoClienteModo) {
      if (!novoClienteNome.trim()) {
        setErro("Informe o nome do novo cliente");
        return;
      }
      try {
        clienteFinalId = await onCadastrarClienteRapido({
          nome: novoClienteNome.trim(),
          telefone: novoClienteTelefone.trim(),
          cidade: novoClienteCidade.trim() || "São Paulo",
          endereco: novoClienteEndereco.trim(),
        });
        clienteFinalNome = novoClienteNome.trim();
      } catch (err: any) {
        setErro(`Erro ao cadastrar cliente: ${err.message}`);
        return;
      }
    } else {
      if (!clienteFinalId) {
        setErro("Selecione um cliente para a venda");
        return;
      }
      const clienteEncontrado = clientes.find((c) => c.id === clienteFinalId);
      clienteFinalNome = clienteEncontrado ? clienteEncontrado.nome : "Cliente";
    }

    if (itens.length === 0) {
      setErro("O pedido deve conter pelo menos um item");
      return;
    }

    // Valida cada item individual
    const itensProcessados = [];
    for (let index = 0; index < itens.length; index++) {
      const item = itens[index];
      const saida = saidasComSaldo.find((s) => s.id === item.saidaId);
      const saldoDisponivel = saida ? saida.saldoDisponivel : 0;

      const qtdNum = Number(item.quantidade);
      if (isNaN(qtdNum) || qtdNum <= 0) {
        setErro(`Item ${index + 1}: Informe uma quantidade válida`);
        return;
      }

      let precoCentavos = 0;
      try {
        precoCentavos = parseBRLInputToCents(item.precoBRL);
      } catch {
        setErro(`Item ${index + 1}: Informe um valor monetário válido para o item`);
        return;
      }

      const validacao = validarItemPedido(
        {
          modeloId: item.modeloId,
          saidaId: item.saidaId,
          tipoUnidade: item.tipoUnidade,
          quantidade: qtdNum,
          precoCentavos,
        },
        saldoDisponivel
      );

      if (!validacao.valido) {
        setErro(`Item ${index + 1}: ${validacao.erro}`);
        return;
      }

      itensProcessados.push({
        modeloId: item.modeloId,
        saidaId: item.saidaId,
        loteId: saida ? saida.loteId : undefined,
        tipoUnidade: item.tipoUnidade,
        quantidade: qtdNum,
        quantidadeUnidades: validacao.unidadesCalculadas,
        pesoKg: item.tipoUnidade === "kg" ? qtdNum : null,
        precoCentavos,
      });
    }

    let freteCentavos = 0;
    try {
      freteCentavos = freteBRL ? parseBRLInputToCents(freteBRL) : 0;
    } catch {
      setErro("Valor de frete inválido");
      return;
    }

    let embalagemCentavos = 0;
    try {
      embalagemCentavos = embalagemBRL ? parseBRLInputToCents(embalagemBRL) : 0;
    } catch {
      setErro("Valor de embalagem inválido");
      return;
    }

    let combustivelCentavos = 0;
    try {
      combustivelCentavos = combustivelBRL ? parseBRLInputToCents(combustivelBRL) : 0;
    } catch {
      setErro("Valor de combustível inválido");
      return;
    }

    // Validação consolidada de saldo de saída para evitar sobre-alocação multi-item
    const saldoPorSaida: Record<string, number> = {};
    for (const s of saidasComSaldo) {
      saldoPorSaida[s.id] = s.saldoDisponivel;
    }

    const validacaoConsolidada = validarPedidoCompleto(
      {
        clienteId: clienteFinalId,
        itens: itensProcessados,
        tipoEnvio,
        freteCentavos,
      },
      saldoPorSaida
    );

    if (!validacaoConsolidada.valido) {
      setErro(validacaoConsolidada.erro || "Saldo insuficiente na remessa da van");
      return;
    }

    try {
      setSalvando(true);
      await onSubmit({
        clienteId: clienteFinalId,
        clienteNome: clienteFinalNome,
        enderecoEntrega: enderecoEntrega.trim() || novoClienteEndereco.trim() || undefined,
        tipoEnvio,
        custoFreteCentavos: freteCentavos,
        custoEmbalagemCentavos: embalagemCentavos,
        custoCombustivelCentavos: combustivelCentavos,
        itens: itensProcessados,
        observacoes,
        responsavelId: usuarioId,
      });
      onClose();
    } catch (err: any) {
      setErro(err.message || "Ocorreu um erro ao salvar o pedido.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-novo-pedido-titulo"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto border-4 border-slate-300">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2
            id="modal-novo-pedido-titulo"
            className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight"
          >
            Novo Pedido de Venda
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] min-w-[48px] text-slate-500 hover:text-slate-900 font-bold text-2xl p-2 rounded-lg"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {erro && (
          <div
            role="alert"
            className="mt-4 p-4 bg-red-100 border-2 border-red-500 rounded-xl text-red-900 font-bold text-lg"
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
          {/* Seção Cliente */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="cliente-select"
                className="text-xl font-bold text-slate-900"
              >
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setNovoClienteModo(!novoClienteModo)}
                className="min-h-[48px] px-3 py-2 text-base font-bold text-blue-700 hover:underline"
              >
                {novoClienteModo ? "← Escolher Cliente Cadastrado" : "+ Novo Cliente Rápido"}
              </button>
            </div>

            {novoClienteModo ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="novo-cliente-nome"
                    className="block text-base font-bold text-slate-800 mb-1"
                  >
                    Nome Completo *
                  </label>
                  <input
                    id="novo-cliente-nome"
                    type="text"
                    value={novoClienteNome}
                    onChange={(e) => setNovoClienteNome(e.target.value)}
                    placeholder="Ex: Chaveiro Central"
                    className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="novo-cliente-telefone"
                    className="block text-base font-bold text-slate-800 mb-1"
                  >
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="novo-cliente-telefone"
                    type="text"
                    value={novoClienteTelefone}
                    onChange={(e) => setNovoClienteTelefone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="novo-cliente-cidade"
                    className="block text-base font-bold text-slate-800 mb-1"
                  >
                    Cidade
                  </label>
                  <input
                    id="novo-cliente-cidade"
                    type="text"
                    value={novoClienteCidade}
                    onChange={(e) => setNovoClienteCidade(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label
                    htmlFor="novo-cliente-endereco"
                    className="block text-base font-bold text-slate-800 mb-1"
                  >
                    Endereço Completo do Cliente
                  </label>
                  <input
                    id="novo-cliente-endereco"
                    type="text"
                    value={novoClienteEndereco}
                    onChange={(e) => {
                      setNovoClienteEndereco(e.target.value);
                      setEnderecoEntrega(e.target.value);
                    }}
                    placeholder="Ex: Rua das Flores, 123 - Bairro Jardim"
                    className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <select
                id="cliente-select"
                value={clienteId}
                onChange={(e) => {
                  const id = e.target.value;
                  setClienteId(id);
                  const cli = clientes.find((c) => c.id === id);
                  if (cli && cli.endereco) {
                    setEnderecoEntrega(cli.endereco);
                  }
                }}
                className="w-full min-h-[48px] text-lg px-4 py-3 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Endereço de Entrega */}
            <div className="pt-3 border-t border-slate-300">
              <label
                htmlFor="pedido-endereco-entrega"
                className="block text-base font-bold text-slate-900 mb-1"
              >
                📍 Endereço de Entrega da Van / Envio
              </label>
              <input
                id="pedido-endereco-entrega"
                type="text"
                value={enderecoEntrega}
                onChange={(e) => setEnderecoEntrega(e.target.value)}
                placeholder="Rua, número, galpão, bairro, ponto de referência..."
                className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium focus:ring-4 focus:ring-blue-500 bg-white"
              />
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Preenchido com o endereço do cliente, mas você pode alterar para outro local de entrega se necessário.
              </p>
            </div>
          </div>

          {/* Seção Itens do Pedido */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                Itens do Pedido (Argolas)
              </h3>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAdicionarItem}
                className="min-h-[48px] text-base font-bold"
              >
                + Adicionar Item
              </Button>
            </div>

            {itens.map((item, index) => {
              const saidasDesteModelo = saidasComSaldo.filter(
                (s) => s.modeloId === item.modeloId
              );

              return (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-lg font-bold text-slate-800">
                      Item #{index + 1}
                    </span>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoverItem(item.id)}
                        className="min-h-[48px] min-w-[48px] px-3 py-2 text-base font-bold text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg inline-flex items-center justify-center transition-colors"
                      >
                        Remover Item
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-base font-bold text-slate-800 mb-1">
                        Modelo de Argola *
                      </label>
                      <select
                        value={item.modeloId}
                        onChange={(e) =>
                          handleAtualizarItem(item.id, "modeloId", e.target.value)
                        }
                        className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                      >
                        {CATALOGO_ARGOLAS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome} ({m.unidadesPorKgAprox} un/kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-slate-800 mb-1">
                        Remessa da Van de Origem *
                      </label>
                      <select
                        value={item.saidaId}
                        onChange={(e) =>
                          handleAtualizarItem(item.id, "saidaId", e.target.value)
                        }
                        className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                      >
                        <option value="">Selecione a remessa...</option>
                        {saidasDesteModelo.map((s) => (
                          <option key={s.id} value={s.id}>
                            Remessa ({s.saldoDisponivel.toLocaleString("pt-BR")}{" "}
                            un disponíveis)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-base font-bold text-slate-800 mb-1">
                        Tipo de Venda
                      </label>
                      <div className="flex gap-2 min-h-[48px] items-center">
                        <label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name={`tipoUnidade-${item.id}`}
                            checked={item.tipoUnidade === "unidades"}
                            onChange={() =>
                              handleAtualizarItem(item.id, "tipoUnidade", "unidades")
                            }
                            className="w-5 h-5"
                          />
                          Unidades (Fracionado)
                        </label>
                        <label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                          <input
                            type="radio"
                            name={`tipoUnidade-${item.id}`}
                            checked={item.tipoUnidade === "kg"}
                            onChange={() =>
                              handleAtualizarItem(item.id, "tipoUnidade", "kg")
                            }
                            className="w-5 h-5"
                          />
                          Quilo (Kg)
                        </label>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`qtd-${item.id}`}
                        className="block text-base font-bold text-slate-800 mb-1"
                      >
                        {item.tipoUnidade === "unidades"
                          ? "Quantidade (unidades) *"
                          : "Peso em Quilos (kg) *"}
                      </label>
                      <input
                        id={`qtd-${item.id}`}
                        aria-label={
                          item.tipoUnidade === "unidades"
                            ? "Quantidade (unidades)"
                            : "Peso em Quilos (kg)"
                        }
                        type="number"
                        step={item.tipoUnidade === "unidades" ? "1" : "0.01"}
                        min={item.tipoUnidade === "unidades" ? "100" : "0.1"}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleAtualizarItem(item.id, "quantidade", e.target.value)
                        }
                        placeholder={
                          item.tipoUnidade === "unidades" ? "Mín. 100" : "Ex: 2.5"
                        }
                        className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`preco-${item.id}`}
                        className="block text-base font-bold text-slate-800 mb-1"
                      >
                        Valor Total do Item (R$) *
                      </label>
                      <input
                        id={`preco-${item.id}`}
                        aria-label="Valor Total do Item (R$)"
                        type="text"
                        value={item.precoBRL}
                        onChange={(e) =>
                          handleAtualizarItem(item.id, "precoBRL", e.target.value)
                        }
                        placeholder="Ex: 50,00"
                        className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seção Logística & Custos de Envio */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-4">
            <h3 className="text-xl font-black text-slate-900">
              Logística e Custos de Envio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="tipo-envio-select"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Forma de Envio *
                </label>
                <select
                  id="tipo-envio-select"
                  aria-label="Forma de Envio"
                  value={tipoEnvio}
                  onChange={(e) => setTipoEnvio(e.target.value as TipoEnvio)}
                  className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                >
                  <option value="lalamove">Lalamove (Terceirizado)</option>
                  <option value="correios">Correios (Terceirizado)</option>
                  <option value="propria">Entrega Própria (Van)</option>
                  <option value="retirada">Retirada no Local</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="frete-input"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Custo do Frete (R$)
                </label>
                <input
                  id="frete-input"
                  aria-label="Custo do Frete (R$)"
                  type="text"
                  value={freteBRL}
                  onChange={(e) => setFreteBRL(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                />
              </div>

              <div>
                <label
                  htmlFor="embalagem-input"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Custo Embalagem (R$)
                </label>
                <input
                  id="embalagem-input"
                  aria-label="Custo Embalagem (R$)"
                  type="text"
                  value={embalagemBRL}
                  onChange={(e) => setEmbalagemBRL(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                />
              </div>

              <div>
                <label
                  htmlFor="combustivel-input"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Combustível (R$)
                </label>
                <input
                  id="combustivel-input"
                  aria-label="Combustível (R$)"
                  type="text"
                  value={combustivelBRL}
                  onChange={(e) => setCombustivelBRL(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[48px] text-lg px-3 py-2 border-2 border-slate-400 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label
              htmlFor="obs-input"
              className="block text-base font-bold text-slate-800 mb-1"
            >
              Observações do Pedido (Opcional)
            </label>
            <input
              id="obs-input"
              type="text"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Entregar até 16h, ligar na portaria"
              className="w-full min-h-[48px] text-lg px-4 py-2 border-2 border-slate-400 rounded-xl font-medium"
            />
          </div>

          {/* Resumo do Pedido */}
          <div className="bg-blue-50 border-2 border-blue-400 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-base font-bold text-blue-900">
                Total de Argolas:{" "}
                <span className="text-xl font-black">
                  {totaisAoVivo.totalUnidades.toLocaleString("pt-BR")} un
                </span>
              </div>
              <div className="text-sm font-semibold text-blue-700">
                Subtotal Itens: {formatCentsToBRL(totaisAoVivo.totalItensCentavos)} + Frete: {formatCentsToBRL(freteCentavos)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-blue-800 block">
                Total Geral:
              </span>
              <span className="text-3xl font-black text-blue-950">
                {formatCentsToBRL(totaisAoVivo.totalGeralCentavos)}
              </span>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={salvando}
              className="w-full sm:w-auto min-h-[48px] text-lg font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={salvando}
              className="w-full sm:w-auto min-h-[48px] text-lg font-black bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {salvando ? "Salvando Pedido..." : "Salvar Pedido"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNovoPedido;
