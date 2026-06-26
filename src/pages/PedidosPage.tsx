import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useOrders, searchOrders } from '@/hooks/useOrders'
import { OrderPreviewPanel } from '@/components/OrderPreviewPanel'
import { CreateTicketForm } from '@/components/CreateTicketForm'
import type { OrderPreview, TicketItem } from '@/types'

type PageState = 'list' | 'preview' | 'form'

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [input, setInput] = useState(searchParams.get('q') ?? '')
  const [committed, setCommitted] = useState(searchParams.get('q') ?? '')
  const [period, setPeriod] = useState('90')
  const [page, setPage] = useState(1)

  // Sugestões em tempo real
  const [suggestions, setSuggestions] = useState<OrderPreview[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>()
  const searchRef = useRef<HTMLDivElement>(null)

  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedOrder, setSelectedOrder] = useState<OrderPreview | null>(null)
  const [ticketItems, setTicketItems] = useState<Omit<TicketItem, 'id' | 'ticket_id'>[]>([])
  const [devolucaoTipo, setDevolucaoTipo] = useState<'total' | 'parcial'>('total')
  const [valorTotal, setValorTotal] = useState(0)

  const { orders, total, loading, error, refetch } = useOrders({
    search: committed, period, page, pageSize: 20
  })

  // Sugestões em tempo real enquanto digita
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

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Se vier com ?q= da busca global
  useEffect(() => {
    const q = searchParams.get('q')
    if (q && q !== committed) {
      setInput(q)
      setCommitted(q)
    }
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
    valor: number
  ) {
    setTicketItems(items)
    setDevolucaoTipo(tipo)
    setValorTotal(valor)
    setPageState('form')
  }

  function handleBack() {
    if (pageState === 'form') setPageState('preview')
    else { setPageState('list'); setSelectedOrder(null) }
  }

  function clearSearch() {
    setInput('')
    setCommitted('')
    setSuggestions([])
    setShowSuggestions(false)
    setPage(1)
    setSearchParams({})
  }

  const totalPages = Math.ceil(total / 20)

  if (pageState === 'preview' && selectedOrder) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="btn-ghost text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">Pré-visualização do Pedido</h1>
        </div>
        <OrderPreviewPanel order={selectedOrder} onConfirm={handlePreviewConfirm} onCancel={handleBack} />
      </div>
    )
  }

  if (pageState === 'form' && selectedOrder) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="btn-ghost text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">Novo Ticket</h1>
        </div>
        <CreateTicketForm
          order={selectedOrder}
          selectedItems={ticketItems}
          devolucaoTipo={devolucaoTipo}
          valorTotal={valorTotal}
          onBack={handleBack}
        />
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

      {/* Busca com autocomplete */}
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

            {/* Dropdown de sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs text-gray-500">
                    {suggestions.length} resultado{suggestions.length !== 1 ? 's' : ''} — clique para abrir
                  </p>
                </div>
                {suggestions.map(order => (
                  <button
                    key={order.id_sales_order}
                    type="button"
                    onClick={() => handleSelectSuggestion(order)}
                    className="w-full text-left px-4 py-3 hover:bg-zf-blue-light transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{order.company_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pedido #{order.id_sales_order}
                          {order.order_city ? ` · ${order.order_city}` : ''}
                          {order.order_vehicle ? ` · ${order.order_vehicle}` : ''}
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
          💡 Busque por nome da oficina, Order ID ou CNPJ. Resultados aparecem enquanto você digita.
        </p>

        <select value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} className="input text-sm w-48">
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="180">Últimos 180 dias</option>
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
            {committed ? `Nenhum pedido encontrado para "${committed}"` : 'Nenhum pedido encontrado'}
          </p>
          <p className="text-sm">
            {!committed
              ? 'Importe o order.xlsx em Configurações para ver os pedidos'
              : 'Tente buscar pelo nome completo ou parcial da oficina'}
          </p>
          {!committed && (
            <a href="/config" className="btn-primary inline-block mt-2 text-sm">Ir para Configurações</a>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total.toLocaleString('pt-BR')} resultado{total !== 1 ? 's' : ''}
            {committed ? ` para "${committed}"` : ''}
          </p>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa / Oficina</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seller(s)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Veículo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <tr
                    key={order.id_sales_order}
                    className="hover:bg-zf-blue-light cursor-pointer transition-colors"
                    onClick={() => handleSelectOrder(order)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{order.company_name}</p>
                      <p className="text-xs text-gray-400">{order.order_city}{order.order_state ? ` / ${order.order_state}` : ''}</p>
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
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40">
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
