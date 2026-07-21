import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X, Car, FileText, Package } from 'lucide-react'
import { useOrders, searchOrders } from '@/hooks/useOrders'
import { OrderPreviewPanel } from '@/components/OrderPreviewPanel'
import { CreateTicketForm } from '@/components/CreateTicketForm'
import { MeiBadge } from '@/components/MeiBadge'
import { useMei } from '@/hooks/useMei'
import { createTicket } from '@/hooks/useTickets'
import { useAuth } from '@/hooks/useAuth'
import { formatarCNPJ } from '@/lib/formatters'
import type { OrderPreview, TicketItem, TicketTipo, TicketSubtipo, CanalEntrada, MeiStatus } from '@/types'

type PageState = 'list' | 'preview' | 'form' | 'review'

interface TicketDraft {
  tipo: TicketTipo
  subtipo: TicketSubtipo | ''
  canal: CanalEntrada
  motivo: string
  chaveXml: string
}

function ReviewStep({
  order,
  selectedItems,
  devolucaoTipo,
  draft,
  meiStatus,
  onConfirm,
  onEdit,
  onCancel,
}: {
  order: OrderPreview
  selectedItems: Omit<TicketItem, 'id' | 'ticket_id'>[]
  devolucaoTipo: 'total' | 'parcial'
  draft: TicketDraft
  meiStatus: MeiStatus
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  const [saving, setSaving] = useState(false)

  const CANAL_LABELS: Record<CanalEntrada, string> = {
    whatsapp_individual: 'WhatsApp Individual',
    whatsapp_grupo: 'WhatsApp Grupo',
    email: 'E-mail',
    outro: 'Outro',
  }

  const TIPO_LABELS: Record<string, string> = {
    devolucao: 'Devolucao',
    garantia: 'Garantia',
  }

  const SUBTIPO_LABELS: Record<string, string> = {
    proxima_entrega: 'Proxima a entrega',
    pos_entrega: 'Pos-entrega ao cliente final',
    envio_fabrica: 'Envio a fabrica para avaliacao',
  }

  const seller = selectedItems[0]

  async function handleConfirm() {
    setSaving(true)
    await onConfirm()
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-sm font-medium text-amber-800">
          Revise os dados antes de confirmar. O ticket sera criado ao clicar em "Confirmar".
        </p>
      </div>

      {/* Dados da oficina */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          <Package size={15} /> Pedido #{order.id_sales_order}
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Empresa</p>
            <p className="font-medium">{order.company_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CNPJ</p>
            <p className="font-medium">{formatarCNPJ(order.company_cnpj)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Seller</p>
            <p className="font-medium">{seller?.merchant_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Loja</p>
            <p className="font-medium">{seller?.merchant_reference || '—'}</p>
          </div>
        </div>
        {order.order_vehicle && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
            <Car size={13} className="text-gray-400" />
            <span>{order.order_vehicle}</span>
          </div>
        )}
        {order.numero_nf && (
          <div className="flex items-center gap-2 text-sm">
            <FileText size={13} className="text-gray-400" />
            <span className="text-gray-500">NF n</span>
            <span className="font-mono font-medium">{order.numero_nf}</span>
          </div>
        )}
        <MeiBadge status={meiStatus} />
      </div>

      {/* Itens selecionados */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">
          Itens ({selectedItems.length}) ·{' '}
          <span className={devolucaoTipo === 'parcial' ? 'text-amber-700' : 'text-gray-600'}>
            {devolucaoTipo === 'total' ? 'Devolucao total' : 'Devolucao parcial'}
          </span>
        </h3>
        <div className="space-y-1.5">
          {selectedItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-zf-blue font-bold shrink-0">·</span>
              <div>
                <p className="font-medium text-gray-800">{item.item_name}</p>
                <p className="text-xs text-gray-400">{item.item_sku}{item.item_brand ? ' · ' + item.item_brand : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dados do ticket */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Dados do Ticket</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Tipo</p>
            <p className="font-medium">{TIPO_LABELS[draft.tipo]}{draft.subtipo ? ' · ' + SUBTIPO_LABELS[draft.subtipo] : ''}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Canal de entrada</p>
            <p className="font-medium">{CANAL_LABELS[draft.canal]}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Motivo</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{draft.motivo}</p>
        </div>
        {draft.chaveXml && draft.chaveXml.length === 44 && (
          <div>
            <p className="text-xs text-gray-400">Chave XML da NF-e</p>
            <p className="font-mono text-xs text-gray-600 mt-0.5">{draft.chaveXml}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost text-sm">Cancelar</button>
        <button onClick={onEdit} className="btn-secondary flex-1 text-sm">Editar</button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="btn-primary flex-1 text-sm"
        >
          {saving ? 'Criando...' : 'Confirmar e Criar Ticket'}
        </button>
      </div>
    </div>
  )
}

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const [committed, setCommitted] = useState(searchParams.get('q') ?? '')
  const [period, setPeriod] = useState('90')
  const [page, setPage] = useState(1)

  const [suggestions, setSuggestions] = useState<OrderPreview[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>()
  const searchRef = useRef<HTMLDivElement>(null)

  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedOrder, setSelectedOrder] = useState<OrderPreview | null>(null)
  const [ticketItems, setTicketItems] = useState<Omit<TicketItem, 'id' | 'ticket_id'>[]>([])
  const [devolucaoTipo, setDevolucaoTipo] = useState<'total' | 'parcial'>('total')
  const [ticketDraft, setTicketDraft] = useState<TicketDraft | null>(null)
  const { status: meiStatus } = useMei(selectedOrder?.company_cnpj ?? '')

  const { orders, total, loading, error, refetch } = useOrders({
    search: committed, period, page, pageSize: 20
  })

  useEffect(() => {
    if (input.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    clearTimeout(suggestTimer.current)
    suggestTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true)
      const results = await searchOrders(input)
      setSuggestions(results.slice(0, 8))
      setShowSuggestions(results.length > 0)
      setLoadingSuggestions(false)
    }, 300)
    return () => clearTimeout(suggestTimer.current)
  }, [input])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== committed) { setInput(q); setCommitted(q) }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCommitted(input)
    setPage(1)
    setShowSuggestions(false)
    setSearchParams(input ? { q: input } : {})
  }

  function handleSelectSuggestion(order: OrderPreview) {
    setInput(order.company_name)
    setShowSuggestions(false)
    setSelectedOrder(order)
    setPageState('preview')
  }

  function handleSelectOrder(order: OrderPreview) {
    setSelectedOrder(order)
    setPageState('preview')
  }

  function handlePreviewConfirm(
    items: Omit<TicketItem, 'id' | 'ticket_id'>[],
    tipo: 'total' | 'parcial',
  ) {
    setTicketItems(items)
    setDevolucaoTipo(tipo)
    setPageState('form')
  }

  function handleFormConfirm(draft: TicketDraft) {
    setTicketDraft(draft)
    setPageState('review')
  }

  async function handleReviewConfirm() {
    if (!selectedOrder || !ticketDraft) return
    const seller = ticketItems[0]

    const ticketData: Record<string, unknown> = {
      order_id: selectedOrder.id_sales_order,
      tipo: ticketDraft.tipo,
      subtipo: ticketDraft.tipo === 'garantia' && ticketDraft.subtipo ? ticketDraft.subtipo : null,
      status: 'aberto',
      canal_entrada: ticketDraft.canal,
      motivo: ticketDraft.motivo,
      company_name: selectedOrder.company_name,
      company_cnpj: selectedOrder.company_cnpj,
      customer_email: selectedOrder.customer_email,
      order_city: selectedOrder.order_city,
      order_state: selectedOrder.order_state,
      order_vehicle: selectedOrder.order_vehicle,
      merchant_reference: seller?.merchant_reference ?? null,
      merchant_name: seller?.merchant_name ?? null,
      numero_nf: (ticketItems[0] as any)?.item_nota_fiscal || selectedOrder.numero_nf || null,
      order_created_at: selectedOrder.order_created_at || null,
      chave_xml_nf: ticketDraft.chaveXml || null,
      mei_status: meiStatus,
      devolucao_tipo: devolucaoTipo,
      valor_total_devolucao: 0,
      created_by: user?.id ?? null,
      data_solicitacao: new Date().toISOString().split('T')[0],
    }

    const items = ticketItems.map(i => ({
      item_sku: i.item_sku,
      item_brand: i.item_brand ?? null,
      item_part_number: i.item_part_number ?? null,
      item_name: i.item_name ?? null,
      item_net_price: i.item_net_price ?? null,
      qtd_original: i.qtd_original,
      qtd_devolvida: i.qtd_devolvida,
      valor_devolvido: i.valor_devolvido ?? null,
      merchant_reference: i.merchant_reference ?? null,
      merchant_name: i.merchant_name ?? null,
    }))

    const result = await createTicket(ticketData, items)
    if (result) navigate(`/tickets/${result.id}`)
  }

  function handleBack() {
    if (pageState === 'review') setPageState('form')
    else if (pageState === 'form') setPageState('preview')
    else { setPageState('list'); setSelectedOrder(null) }
  }

  function clearSearch() {
    setInput(''); setCommitted(''); setSuggestions([])
    setShowSuggestions(false); setPage(1); setSearchParams({})
  }

  const totalPages = Math.ceil(total / 20)

  // Titulo e breadcrumb por estado
  const titles: Record<PageState, string> = {
    list: 'Pedidos',
    preview: 'Pre-visualizacao do Pedido',
    form: 'Novo Ticket',
    review: 'Revisar e Confirmar',
  }

  if (pageState !== 'list') {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="btn-ghost text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">{titles[pageState]}</h1>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {['preview', 'form', 'review'].map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                {i > 0 && <span>›</span>}
                <span className={pageState === s ? 'text-zf-blue font-medium' : ''}>
                  {s === 'preview' ? '1. Selecao' : s === 'form' ? '2. Dados' : '3. Revisao'}
                </span>
              </span>
            ))}
          </div>
        </div>

        {pageState === 'preview' && selectedOrder && (
          <OrderPreviewPanel
            order={selectedOrder}
            onConfirm={(items, tipo) => handlePreviewConfirm(items, tipo)}
            onCancel={handleBack}
          />
        )}

        {pageState === 'form' && selectedOrder && (
          <CreateTicketForm
            order={selectedOrder}
            selectedItems={ticketItems}
            devolucaoTipo={devolucaoTipo}
            onConfirm={handleFormConfirm}
            onBack={handleBack}
          />
        )}

        {pageState === 'review' && selectedOrder && ticketDraft && (
          <ReviewStep
            order={selectedOrder}
            selectedItems={ticketItems}
            devolucaoTipo={devolucaoTipo}
            draft={ticketDraft}
            meiStatus={meiStatus}
            onConfirm={handleReviewConfirm}
            onEdit={() => setPageState('form')}
            onCancel={() => { setPageState('list'); setSelectedOrder(null) }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <button onClick={refetch} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <form onSubmit={handleSubmit}>
          <div ref={searchRef} className="relative">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Nome da oficina, Order ID ou CNPJ..."
                  className="input pl-9 pr-8"
                  autoFocus
                />
                {input && (
                  <button type="button" onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={15} />
                  </button>
                )}
                {loadingSuggestions && (
                  <RefreshCw size={13} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
              <button type="submit" className="btn-primary px-5">Buscar</button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-500">{suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''} — clique para abrir</p>
                </div>
                {suggestions.map(order => (
                  <button key={order.id_sales_order} type="button"
                    onClick={() => handleSelectSuggestion(order)}
                    className="w-full text-left px-4 py-3 hover:bg-zf-blue-light transition-colors border-b border-gray-50 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{order.company_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pedido #{order.id_sales_order}
                          {order.order_city ? ' · ' + order.order_city : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {order.sellers.slice(0, 2).map(s => (
                            <span key={s.merchant_reference} className="badge bg-gray-100 text-gray-600 text-xs">
                              {s.merchant_name}
                            </span>
                          ))}
                        </div>
                        {order.order_created_at && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(order.order_created_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        <p className="text-xs text-gray-400">
          Busque por nome da oficina, Order ID ou CNPJ. Resultados aparecem enquanto voce digita.
        </p>

        <select value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} className="input text-sm w-48">
          <option value="30">Ultimos 30 dias</option>
          <option value="60">Ultimos 60 dias</option>
          <option value="90">Ultimos 90 dias</option>
          <option value="180">Ultimos 180 dias</option>
          <option value="">Todos os pedidos</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-zf-blue" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-3">
          <p className="font-medium text-gray-600">
            {committed ? 'Nenhum pedido encontrado para "' + committed + '"' : 'Nenhum pedido encontrado'}
          </p>
          <p className="text-sm">
            {!committed ? 'Importe o order.xlsx em Configuracoes para ver os pedidos' : 'Tente buscar pelo nome completo ou parcial da oficina'}
          </p>
          {!committed && <a href="/config" className="btn-primary inline-block mt-2 text-sm">Ir para Configuracoes</a>}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total.toLocaleString('pt-BR')} resultado{total !== 1 ? 's' : ''}
            {committed ? ' para "' + committed + '"' : ''}
          </p>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa / Oficina</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seller(s)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Veiculo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <tr key={order.id_sales_order}
                    className="hover:bg-zf-blue-light cursor-pointer transition-colors"
                    onClick={() => handleSelectOrder(order)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{order.company_name}</p>
                      <p className="text-xs text-gray-400">{order.order_city}{order.order_state ? ' / ' + order.order_state : ''}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-zf-blue font-medium">#{order.id_sales_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {order.sellers.slice(0, 2).map(s => (
                          <span key={s.merchant_reference} className="badge bg-gray-100 text-gray-700 text-xs">{s.merchant_name}</span>
                        ))}
                        {order.sellers.length > 2 && (
                          <span className="badge bg-gray-100 text-gray-500 text-xs">+{order.sellers.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{order.order_vehicle || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {order.order_created_at ? new Date(order.order_created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zf-blue text-xs font-medium">Abrir →</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40">
                <ChevronLeft size={15} /> Anterior
              </button>
              <span className="text-sm text-gray-500">Pagina {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40">
                Proxima <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
