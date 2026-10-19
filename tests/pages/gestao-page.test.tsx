import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { GestaoHome } from '@/components/dashboard/GestaoHome';
import { CardsLucroResumo } from '@/components/gestao/CardsLucroResumo';
import { TabelaLucroModelos } from '@/components/gestao/TabelaLucroModelos';
import { ModalComoCalculamos } from '@/components/gestao/ModalComoCalculamos';
import { calcularMetricasLucro } from '@/lib/gestao/lucro-engine';

vi.mock('next/link', () => {
  return {
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
  };
});

describe('Módulo Gestão e Telas de Apoio', () => {
  it('GestaoHome deve renderizar os links clicáveis para o Painel de Lucro, Clientes e Relatórios', () => {
    render(<GestaoHome />);

    const linkLucro = screen.getByRole('link', { name: /painel de lucro/i });
    expect(linkLucro).toBeDefined();
    expect(linkLucro.getAttribute('href')).toBe('/gestao/lucro');

    const linkClientes = screen.getByRole('link', { name: /clientes/i });
    expect(linkClientes).toBeDefined();
    expect(linkClientes.getAttribute('href')).toBe('/gestao/clientes');

    const linkRelatorios = screen.getByRole('link', { name: /relatórios/i });
    expect(linkRelatorios).toBeDefined();
    expect(linkRelatorios.getAttribute('href')).toBe('/gestao/relatorios');
  });

  it('CardsLucroResumo deve exibir 3 cartões grandes e destacar alerta quando houver margem negativa', () => {
    const metricasNegativas = calcularMetricasLucro([
      {
        id: 'ped-teste',
        numeroPedido: 99,
        clienteId: 'c1',
        clienteNome: 'Cliente Prejuizo',
        data: new Date(),
        tipoEnvio: 'correios',
        custoFreteCentavos: 5000,
        custoEmbalagemCentavos: 1000,
        custoCombustivelCentavos: 0,
        itens: [
          {
            modeloId: 'argola-22mm',
            saidaId: 's1',
            tipoUnidade: 'unidades',
            quantidade: 100,
            quantidadeUnidades: 100,
            precoCentavos: 2000,
            custoMateriaPrimaCentavos: 3000,
          },
        ],
        totalItensCentavos: 2000,
        totalPedidoCentavos: 2000,
        totalUnidades: 100,
        situacao: 'entregue',
        responsavelId: 'u1',
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      },
    ]);

    render(<CardsLucroResumo metricas={metricasNegativas} />);

    expect(screen.getByText(/Lucro Líquido Real/i)).toBeDefined();
    expect(screen.getByText(/Receita Bruta/i)).toBeDefined();
    expect(screen.getByText(/Custos Totais/i)).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/Atenção: Margem Negativa/i)).toBeDefined();
  });

  it('TabelaLucroModelos deve listar todos os 7 modelos do catálogo', () => {
    const metricas = calcularMetricasLucro([]);
    render(<TabelaLucroModelos modelos={metricas.desempenhoPorModelo} />);

    expect(screen.getByText('Argola 16mm')).toBeDefined();
    expect(screen.getByText('Argola 19mm')).toBeDefined();
    expect(screen.getByText('Argola 19mm c/ Corrente')).toBeDefined();
    expect(screen.getByText('Argola 22mm')).toBeDefined();
    expect(screen.getByText('Argola 22mm Batida')).toBeDefined();
    expect(screen.getByText('Argola 22mm c/ Corrente')).toBeDefined();
    expect(screen.getByText('Argola 25mm')).toBeDefined();
  });

  it('ModalComoCalculamos deve renderizar a fórmula e permitir fechar', () => {
    const onFechar = vi.fn();
    render(<ModalComoCalculamos aberto={true} onFechar={onFechar} />);

    expect(screen.getByText(/Como calculamos o lucro\?/i)).toBeDefined();
    expect(screen.getByText(/Receita Total de Vendas/i)).toBeDefined();

    const botaoEntendido = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(botaoEntendido);
    expect(onFechar).toHaveBeenCalledTimes(1);
  });
});
