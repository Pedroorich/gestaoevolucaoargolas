'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { listarPedidosVendas } from '@/lib/firebase/vendas-service';
import { listarLotesAtivos, listarSaidasAtivas } from '@/lib/firebase/producao-service';
import { toReais } from '@/lib/money';

export default function RelatoriosPage() {
  const [baixando, setBaixando] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const baixarCSV = (conteudo: string, nomeArquivo: string) => {
    const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarPedidos = async () => {
    setBaixando('pedidos');
    try {
      const pedidos = await listarPedidosVendas();
      const cabecalho = 'Numero;Data;Cliente;Tipo Envio;Total (R$);Frete (R$);Situacao;Total Unidades\n';
      const linhas = pedidos
        .map((p) => {
          const dataStr = new Date(p.data).toLocaleDateString('pt-BR');
          return `${p.numeroPedido};${dataStr};"${p.clienteNome}";${p.tipoEnvio};${toReais(
            p.totalPedidoCentavos
          ).toFixed(2)};${toReais(p.custoFreteCentavos).toFixed(2)};${p.situacao};${p.totalUnidades}`;
        })
        .join('\n');

      baixarCSV(cabecalho + linhas, `pedidos_evolucao_argolas_${new Date().toISOString().slice(0, 10)}.csv`);
      setSucesso('Pedidos exportados com sucesso!');
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar pedidos');
    } finally {
      setBaixando(null);
    }
  };

  const exportarProducao = async () => {
    setBaixando('producao');
    try {
      const lotes = await listarLotesAtivos();
      const cabecalho = 'Lote ID;Data;Modelo;Qtd Produzida;Perdas;Custo Material (R$);Custo Unitario (R$)\n';
      const linhas = lotes
        .map((l) => {
          const dataStr = new Date(l.data).toLocaleDateString('pt-BR');
          return `${l.id};${dataStr};${l.modeloId};${l.quantidadeProduzida};${l.perdas};${toReais(
            l.custoMaterialCentavos || 0
          ).toFixed(2)};${toReais(l.custoUnitarioCentavos || 0).toFixed(4)}`;
        })
        .join('\n');

      baixarCSV(cabecalho + linhas, `producao_lotes_${new Date().toISOString().slice(0, 10)}.csv`);
      setSucesso('Lotes de produção exportados com sucesso!');
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar produção');
    } finally {
      setBaixando(null);
    }
  };

  const exportarSaidas = async () => {
    setBaixando('saidas');
    try {
      const saidas = await listarSaidasAtivas();
      const cabecalho = 'Saida ID;Lote ID;Data;Modelo;Quantidade;Transporte\n';
      const linhas = saidas
        .map((s) => {
          const dataStr = new Date(s.data).toLocaleDateString('pt-BR');
          return `${s.id};${s.loteId};${dataStr};${s.modeloId};${s.quantidade};${s.transporte}`;
        })
        .join('\n');

      baixarCSV(cabecalho + linhas, `saidas_logistica_${new Date().toISOString().slice(0, 10)}.csv`);
      setSucesso('Saídas para logística exportadas com sucesso!');
      setTimeout(() => setSucesso(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar saídas');
    } finally {
      setBaixando(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3 border-b pb-4">
        <Link
          href="/"
          className="p-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-700"
          aria-label="Voltar para a página inicial"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-black">
            Relatórios e Exportação
          </h1>
          <p className="text-gray-600 text-base md:text-lg">
            Exporte os dados completos do sistema para Excel e planilhas CSV
          </p>
        </div>
      </div>

      {sucesso && (
        <div
          role="status"
          className="bg-green-50 border-2 border-green-500 rounded-2xl p-4 flex items-center gap-3 text-green-900"
        >
          <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
          <p className="text-lg font-bold">{sucesso}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-gray-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="p-3 bg-orange-100 text-brand-orange w-fit rounded-xl mb-3">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-brand-black">Planilha de Vendas</h2>
            <p className="text-gray-600 text-base mt-1">
              Todos os pedidos, clientes, valores totais cobrados, custos de frete e situação de
              entrega.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={exportarPedidos}
            disabled={baixando === 'pedidos'}
            className="w-full flex items-center justify-center gap-2 text-base min-h-[48px]"
          >
            <Download className="w-5 h-5" />
            {baixando === 'pedidos' ? 'Gerando...' : 'Exportar Vendas (.CSV)'}
          </Button>
        </Card>

        <Card className="border-2 border-gray-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="p-3 bg-blue-100 text-brand-blue w-fit rounded-xl mb-3">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-brand-black">Lotes de Fabricação</h2>
            <p className="text-gray-600 text-base mt-1">
              Histórico dos lotes produzidos na fábrica, perdas registradas e rateio do custo de
              arame.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={exportarProducao}
            disabled={baixando === 'producao'}
            className="w-full flex items-center justify-center gap-2 text-base min-h-[48px] border-brand-blue text-brand-blue hover:bg-blue-50"
          >
            <Download className="w-5 h-5" />
            {baixando === 'producao' ? 'Gerando...' : 'Exportar Produção (.CSV)'}
          </Button>
        </Card>

        <Card className="border-2 border-gray-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="p-3 bg-gray-100 text-gray-700 w-fit rounded-xl mb-3">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-brand-black">Remessas da Van</h2>
            <p className="text-gray-600 text-base mt-1">
              Histórico das remessas enviadas da fábrica para a van de distribuição ou transportadoras.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={exportarSaidas}
            disabled={baixando === 'saidas'}
            className="w-full flex items-center justify-center gap-2 text-base min-h-[48px] border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            <Download className="w-5 h-5" />
            {baixando === 'saidas' ? 'Gerando...' : 'Exportar Remessas (.CSV)'}
          </Button>
        </Card>
      </div>
    </div>
  );
}
