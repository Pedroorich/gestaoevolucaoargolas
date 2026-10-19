/**
 * Tipos e Estruturas de Domínio — Evolução Argolas
 */

export type PerfilUsuario = 'producao' | 'logistica' | 'gestao';

export type StatusUsuario = 'pendente' | 'aprovado' | 'rejeitado';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  status: StatusUsuario;
  aprovado: boolean;
  isAdminMaster?: boolean;
  doisFatoresAtivo?: boolean;
  ativo: boolean;
  criadoEm: string;
  aprovadoPor?: string | null;
  aprovadoEm?: string | null;
  motivoRejeicao?: string | null;
}

export type ModeloArgolaId =
  | 'argola-16mm'
  | 'argola-19mm'
  | 'argola-19mm-corrente'
  | 'argola-22mm'
  | 'argola-22mm-batida'
  | 'argola-22mm-corrente'
  | 'argola-25mm';

export interface ModeloArgola {
  id: ModeloArgolaId;
  nome: string;
  diametroMm: number;
  descricao: string;
  unidadesPorKgAprox: number;
}

export const CATALOGO_MODELOS: ModeloArgola[] = [
  {
    id: 'argola-16mm',
    nome: 'Argola 16mm',
    diametroMm: 16,
    descricao: 'Argola lisa 16mm para chaveiro',
    unidadesPorKgAprox: 1200,
  },
  {
    id: 'argola-19mm',
    nome: 'Argola 19mm',
    diametroMm: 19,
    descricao: 'Argola lisa 19mm tradicional',
    unidadesPorKgAprox: 950,
  },
  {
    id: 'argola-19mm-corrente',
    nome: 'Argola 19mm c/ Corrente',
    diametroMm: 19,
    descricao: 'Argola 19mm montada com corrente e elo',
    unidadesPorKgAprox: 450,
  },
  {
    id: 'argola-22mm',
    nome: 'Argola 22mm',
    diametroMm: 22,
    descricao: 'Argola lisa 22mm reforçada',
    unidadesPorKgAprox: 650,
  },
  {
    id: 'argola-22mm-batida',
    nome: 'Argola 22mm Batida',
    diametroMm: 22,
    descricao: 'Argola 22mm com acabamento achatado batido',
    unidadesPorKgAprox: 620,
  },
  {
    id: 'argola-22mm-corrente',
    nome: 'Argola 22mm c/ Corrente',
    diametroMm: 22,
    descricao: 'Argola 22mm montada com corrente e elo',
    unidadesPorKgAprox: 380,
  },
  {
    id: 'argola-25mm',
    nome: 'Argola 25mm',
    diametroMm: 25,
    descricao: 'Argola grande 25mm para molhos pesados',
    unidadesPorKgAprox: 500,
  },
];

export type TipoEnvio = 'van_propria' | 'propria' | 'lalamove' | 'correios' | 'retirada' | 'outro';
export type DestinoSaida = 'centro_logistica' | 'banho';
export type StatusBanho = 'nao_aplicavel' | 'em_banho' | 'concluido';
export type SituacaoPedido = 'pendente' | 'separado' | 'enviado' | 'entregue' | 'cancelada';
export type SituacaoCliente = 'nunca_prospectado' | 'prospectado' | 'ja_comprou' | 'cliente_fiel';
export type CategoriaDespesa = 'combustivel_van' | 'embalagem' | 'manutencao_van' | 'arame' | 'outros';

export const CATALOGO_ARGOLAS = CATALOGO_MODELOS;

export interface LoteProducao {
  id: string;
  data: Date;
  modeloId: ModeloArgolaId | string;
  quantidadeProduzida: number;
  pesoKg?: number | null;
  perdas: number;
  custoMaterialCentavos?: number;
  custoUnitarioCentavos?: number;
  observacoes?: string;
  responsavelId: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface SaidaProducao {
  id: string;
  loteId: string;
  modeloId: ModeloArgolaId | string;
  quantidade: number;
  transporte: TipoEnvio;
  destino?: DestinoSaida;
  statusBanho?: StatusBanho;
  dataRetornoBanho?: Date | null;
  data: Date;
  responsavelId: string;
  ativo: boolean;
}

export interface LogAuditoria {
  id: string;
  usuarioId: string;
  usuarioNome: string;
  acao: 'CRIAR' | 'EDITAR' | 'EXCLUIR_LOGICO' | 'RESTAURAR' | 'EXPORTAR';
  tabela: string;
  registroId: string;
  valoresAnteriores?: Record<string, unknown> | null;
  valoresNovos?: Record<string, unknown> | null;
  data: Date;
}

export interface ItemPedidoVenda {
  id?: string;
  modeloId: ModeloArgolaId | string;
  saidaId: string;
  loteId?: string;
  tipoUnidade: 'unidades' | 'kg';
  quantidade: number;
  quantidadeUnidades: number;
  pesoKg?: number | null;
  precoCentavos: number;
  custoMateriaPrimaCentavos?: number;
}

export interface PedidoVenda {
  id: string;
  numeroPedido: number;
  clienteId: string;
  clienteNome: string;
  enderecoEntrega?: string;
  data: Date;
  tipoEnvio: TipoEnvio;
  custoFreteCentavos: number;
  custoEmbalagemCentavos: number;
  custoCombustivelCentavos?: number;
  itens: ItemPedidoVenda[];
  totalItensCentavos: number;
  totalPedidoCentavos: number;
  totalUnidades: number;
  situacao: SituacaoPedido;
  observacoes?: string;
  responsavelId: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  cidade: string;
  endereco?: string;
  cep?: string;
  origemContato?: string;
  totalCompras: number;
  dataUltimaCompra?: Date | null;
  situacao: SituacaoCliente;
  ativo: boolean;
}
