export type TicketStatus =
  | 'aberto'
  | 'contato_enviado'
  | 'aguardando_autorizacao'
  | 'autorizado'
  | 'nfd_pendente'
  | 'logistica_reversa_concluida'
  | 'encerrado'
  | 'recusado'
  | 'peca_enviada_fabrica'
  | 'em_analise_fabrica'
  | 'laudo_recebido'

export type TicketTipo = 'devolucao' | 'garantia'
export type TicketSubtipo = 'proxima_entrega' | 'pos_entrega' | 'envio_fabrica'
export type CanalEntrada = 'whatsapp_grupo' | 'whatsapp_individual' | 'email' | 'outro'
export type MeiStatus = 'mei' | 'nao_mei' | 'nao_encontrado' | 'pessoa_fisica' | 'nao_verificado'
export type CanalSeller = 'whatsapp' | 'email' | 'ambos' | 'formulario'
export type LogTipo = 'whatsapp' | 'email' | 'ligacao' | 'sistema' | 'outro'
export type DevolucaoTipo = 'parcial' | 'total'

export interface TicketItem {
  id?: string
  ticket_id?: string
  item_sku: string
  item_brand?: string
  item_part_number?: string
  item_name?: string
  item_net_price?: number
  qtd_original: number
  qtd_devolvida: number
  valor_devolvido?: number
  merchant_reference?: string
  merchant_name?: string
}

export interface Ticket {
  id: string
  ticket_number: number
  order_id: string
  tipo: TicketTipo
  subtipo?: TicketSubtipo
  status: TicketStatus
  canal_entrada?: CanalEntrada
  motivo: string
  company_name?: string
  company_cnpj?: string
  customer_email?: string
  order_city?: string
  order_state?: string
  order_vehicle?: string
  merchant_reference?: string
  merchant_name?: string
  numero_nf?: string
  chave_xml_nf?: string
  responsavel_id?: string
  responsavel_email?: string
  mei_status?: MeiStatus
  devolucao_tipo: DevolucaoTipo
  valor_total_devolucao?: number
  created_by?: string
  data_solicitacao: string
  created_at: string
  updated_at: string
  items?: TicketItem[]
}

export interface TicketLog {
  id: string
  ticket_id: string
  tipo: LogTipo
  mensagem: string
  created_by?: string
  created_at: string
}

export interface Seller {
  id: string
  merchant_reference: string
  merchant_name: string
  canal_preferencial?: CanalSeller
  contato_nome?: string
  contato_email?: string
  contato_whatsapp?: string
  url_formulario?: string
  instrucoes?: string
  template_mensagem?: string
  regras_excecao?: string
  created_at: string
  updated_at: string
}

export interface SlaConfig {
  id: string
  status: string
  dias_uteis_max: number
}

export interface OrderRow {
  id_sales_order: string
  company_name?: string
  company_cnpj?: string
  customer_email?: string
  order_city?: string
  order_state?: string
  order_vehicle?: string
  item_sku: string
  item_brand?: string
  item_part_number?: string
  item_name?: string
  item_net_price?: number
  item_quantity?: number
  item_state?: string
  merchant_reference?: string
  merchant_name?: string
  item_nota_fiscal?: string
  item_chave_xml_nf?: string
  order_created_at?: string
  order_paid_date?: string
}

export interface OrderPreview {
  id_sales_order: string
  company_name: string
  company_cnpj: string
  customer_email: string
  order_city: string
  order_state: string
  order_vehicle: string
  order_created_at: string
  order_paid_date: string
  numero_nf: string
  chave_xml_nf: string
  sellers: {
    merchant_reference: string
    merchant_name: string
    items: OrderRow[]
  }[]
}

export interface SlaInfo {
  dias_uteis: number
  percentual: number
  status: 'ok' | 'warning' | 'critical'
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  aberto: 'Aberto',
  contato_enviado: 'Contato Enviado',
  aguardando_autorizacao: 'Aguardando Autorização',
  autorizado: 'Autorizado',
  nfd_pendente: 'NFD Pendente',
  pronto_para_retirada: 'Pronto para Retirada',
  logistica_reversa_concluida: 'Logistica Reversa Concluida',
  encerrado: 'Estorno Realizado',
  recusado: 'Recusado',
  peca_enviada_fabrica: 'Peça Enviada à Fábrica',
  em_analise_fabrica: 'Em Análise na Fábrica',
  laudo_recebido: 'Laudo Recebido',
}

export const KANBAN_COLUMNS: TicketStatus[] = [
  'aberto',
  'contato_enviado',
  'aguardando_autorizacao',
  'autorizado',
  'nfd_pendente',
  'logistica_reversa_concluida',
  'encerrado',
  'recusado',
]
