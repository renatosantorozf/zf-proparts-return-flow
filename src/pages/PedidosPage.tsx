import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useOrders, getOrderPreview } from '@/hooks/useOrders'
import { OrderPreviewPanel } from '@/components/OrderPreviewPanel'
import { CreateTicketForm } from '@/components/CreateTicketForm'
import type { OrderPreview, TicketItem } from '@/types'

type PageState = 'list' | 'preview' | 'form'

export default function PedidosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [seller, setSeller] = useState('')
  const [period, setPeriod] = useState('90')
  const [page, setPage] = useState(1)

  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedOrder, setSelectedOrder] = useState<OrderPreview | null>(null)
  const [ticketItems, setTicketItems] = useState<Omit<TicketItem, 'id' | 'ticket_id'>[]>([])
  const [devolucaoTipo, setDevolucaoTipo] = useState<'total' | 'parcial'>('total')
  const [valorTotal, setValorTotal] = useState(0)
  const [loadingOrder, setLoadingOrder] = useState(false)

  const { orders, total, loading, error, refetch } = useOrders({
    search, seller, period, page, pageSize: 20
  })

  // Se vier da busca global com ?q=
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setSearchInput(q)
      setSearch(q)
      handleSearchOrder(q)
    }
  }, [])

  async function handleSearchOrder(orderId: string) {
    if (!orderId.trim()) return
    setLoadingOrder(true)
    const order = await getOrderPreview(orderId.trim())
    setLoadingOrder(false)
    if (order) {
      setSelectedOrder(order)
      setPageState('preview')
    } else {
      alert(`Pedido "${orderId}" não encontrado. Verifique o ID ou importe a planilha atualizada em Configurações.`)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
    setSearchParams(searchInput ? { q: searchInput } : {})
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

  const totalPages = Math.ceil(total / 20)

  if (pageState === 'preview' && selectedOrder) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="btn-ghost text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">Pré-visualização do Pedido</h1>
        </div>
        <OrderPreviewPanel
          order={selectedOrder}
          onConfirm={handlePreviewConfirm}
          onCancel={handleBack}
        />
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
          <RefreshCw size={14} />Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por Order ID..."
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn-primary px-5">Buscar</button>
          {loadingOrder && (
            <div className="flex items-center px-3">
              <RefreshCw size={15} className="animate-spin text-zf-blue" />
            </div>
          )}
        </form>

        <div className="flex gap-3">
          <select
            value={period}
            onChange={e => { setPeriod(e.target.value); setPage(1) }}
            className="input flex-1"
          >
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 180 dias</option>
            <option value="">Todos</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} />
          {error}
          {error.includes('não encontrada') && (
            <span className="ml-1 text-red-500">— Importe o order.xlsx em <a href="/config" className="underline">Configurações</a></span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-zf-blue" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="font-medium">Nenhum pedido encontrado</p>
          <p className="text-sm mt-1">
            {search
              ? 'Verifique o Order ID ou importe uma planilha atualizada'
              : 'Importe o order.xlsx em Configurações para ver os pedidos'}
          </p>
          <a href="/config" className="btn-primary inline-block mt-4 text-sm">
            Ir para Configurações
          </a>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{total.toLocaleString('pt-BR')} pedidos encontrados</p>

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Seller(s)</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Veículo</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">NF</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map(order => (
                  <tr
                    key={order.id_sales_order}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectOrder(order)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-zf-blue">
                      #{order.id_sales_order}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 truncate max-w-[160px]">{order.company_name}</p>
                      <p className="text-xs text-gray-400">{order.order_city}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {order.sellers.slice(0, 2).map(s => (
                          <span key={s.merchant_reference} className="badge bg-gray-100 text-gray-700 text-xs">
                            {s.merchant_name}
                          </span>
                        ))}
                        {order.sellers.length > 2 && (
                          <span className="badge bg-gray-100 text-gray-500 text-xs">+{order.sellers.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                      {order.order_vehicle || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {order.order_created_at
                        ? new Date(order.order_created_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {order.numero_nf
                        ? <span className="badge bg-green-50 text-green-700">{order.numero_nf}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-zf-blue text-xs font-medium">Abrir →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <ChevronLeft size={15} /> Anterior
              </button>
              <span className="text-sm text-gray-500">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-sm flex items-center gap-1 disabled:opacity-40"
              >
                Próxima <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
