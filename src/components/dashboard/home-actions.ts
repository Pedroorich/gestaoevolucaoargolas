import { PerfilUsuario } from '@/types/domain';

export interface HomeAction {
  id: string;
  label: string;
  descricao: string;
  href: string;
  variant: 'primary' | 'secondary';
  icon: string;
}

/**
 * Ações diretas da tela inicial por perfil.
 * Regra Seção 9.2: Cada usuário entra em uma tela inicial com no máximo três botões grandes.
 * Quem chega ao sistema nunca precisa procurar o que fazer.
 */
export function getHomeActionsForProfile(perfil: PerfilUsuario): HomeAction[] {
  switch (perfil) {
    case 'producao':
      return [
        {
          id: 'lancar-producao',
          label: 'Lançar produção',
          descricao: 'Cadastrar novo lote de argolas fabricadas',
          href: '/producao/novo-lote',
          variant: 'primary',
          icon: 'PackagePlus',
        },
        {
          id: 'registrar-saida',
          label: 'Registrar saída',
          descricao: 'Registrar envio de argolas na van para logística',
          href: '/producao/saida',
          variant: 'secondary',
          icon: 'Truck',
        },
        {
          id: 'ver-estoque',
          label: 'Ver estoque',
          descricao: 'Conferir saldo disponível e perdas na fábrica',
          href: '/producao/estoque',
          variant: 'secondary',
          icon: 'Boxes',
        },
      ];

    case 'logistica':
      return [
        {
          id: 'registrar-entrega',
          label: 'Registrar entrega',
          descricao: 'Lançar entrega realizada para o cliente',
          href: '/vendas/nova',
          variant: 'primary',
          icon: 'ShoppingBag',
        },
        {
          id: 'entregas-pendentes',
          label: 'Entregas pendentes',
          descricao: 'Ver pedidos a caminho ou aguardando entrega',
          href: '/vendas/pendentes',
          variant: 'secondary',
          icon: 'Clock',
        },
      ];

    case 'gestao':
      return [
        {
          id: 'painel-lucro',
          label: 'Painel de lucro',
          descricao: 'Ver faturamento, margem e lucro real do período',
          href: '/gestao/lucro',
          variant: 'primary',
          icon: 'TrendingUp',
        },
        {
          id: 'clientes',
          label: 'Clientes',
          descricao: 'Histórico de compras e clientes há +30 dias sem comprar',
          href: '/gestao/clientes',
          variant: 'secondary',
          icon: 'Users',
        },
        {
          id: 'relatorios',
          label: 'Relatórios',
          descricao: 'Exportar dados em planilha e resumo da operação',
          href: '/gestao/relatorios',
          variant: 'secondary',
          icon: 'FileSpreadsheet',
        },
      ];
  }
}
