import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, RefreshCw } from 'lucide-react'
import { useTickets, updateTicketStatus } from '@/hooks/useTickets'
import { useSla } from '@/hooks/useSla'
import { calcularDiasUteis } from '@/lib/dateUtils'
import { formatarMoeda } from '@/lib/formatters'
import type { Ticket, TicketStatus } from '@/types'
import { KANBAN_COLUMNS, STATUS_LABELS } from '@/types'

function AgingBadge({ createdAt, status, getSlaInfo }: {
  createdAt: string
  status: TicketStatus
  getSlaInfo: ReturnType<typeof useSla>['getSlaInfo']
}) {
  const info = getSlaInfo(status, createdAt)
  const colorMap = {
    ok:       'bg-green-100 text-green-700',
    warning:  'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`badge ${colorMap[info.status]} font-mono text-xs`}>
      {info.dias_uteis} du
    </span>
  )
}

function KanbanCard({ ticket, getSlaInfo, onClick }: {
  ticket: Ticket
  getSlaInfo: ReturnType<typeof useSla>['getSlaInfo']
  onClick: () => void
}) {
  const info = getSlaInfo(ticket.status, ticket.created_at)
  const borderColor = {
    ok:       'border-l-green-400',
    warning:  'border-l-yellow-400',
    critical: 'border-l-red-500',
  }[info.status]

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${borderColor} p-3 cursor-pointer hover:shadow-md transition-shadow space-y-2`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs font-bold text-zf-blue">T#{ticket.ticket_number}</span>
          <span className="text-xs text-gray-400 ml-1">· Pedido #{ticket.order_id}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`badge text-xs ${ticket.tipo === 'garantia' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
            {ticket.tipo === 'garantia' ? 'G' : 'D'}
          </span>
          {ticket.devolucao_tipo === 'parcial' && (
            <span className="badge bg-amber-100 text-amber-700 text-xs">P</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-800 truncate">{ticket.company_name || '—'}</p>
        <p className="text-xs text-gray-500 truncate">{ticket.merchant_name || '—'}</p>
      </div>

      {ticket.order_vehicle && (
        <p className="text-xs text-gray-400 truncate">{ticket.order_vehicle}</p>
      )}

      <div className="flex items-center justify-between">
        <AgingBadge createdAt={ticket.created_at} status={ticket.status} getSlaInfo={getSlaInfo} />
        {ticket.valor_total_devolucao && (
          <span className="text-xs text-gray-500">{formatarMoeda(ticket.valor_total_devolucao)}</span>
        )}
      </div>

      {ticket.mei_status === 'nao_mei' && (
        <span className="badge bg-yellow-50 text-yellow-600 text-xs">NFD obrigatória</span>
      )}
    </div>
  )
}

function KanbanColumn({ status, tickets, getSlaInfo, onCardClick, onDrop }: {
  status: TicketStatus
  tickets: Ticket[]
  getSlaInfo: ReturnType<typeof useSla>['getSlaInfo']
  onCardClick: (id: string) => void
  onDrop: (ticketId: string, newStatus: TicketStatus) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const criticalCount = tickets.filter(t => getSlaInfo(t.status, t.created_at).status === 'critical').length

  return (
    <div
      className={`flex flex-col min-w-[240px] w-[240px] rounded-xl transition-colors ${dragOver ? 'bg-zf-blue-light' : 'bg-gray-100'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const id = e.dataTransfer.getData('ticketId')
        if (id) onDrop(id, status)
      }}
    >
      {/* Header da coluna */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{STATUS_LABELS[status]}</span>
          <span className="badge bg-gray-200 text-gray-600 text-xs">{tickets.length}</span>
        </div>
        {criticalCount > 0 && (
          <span className="badge bg-red-100 text-red-600 text-xs flex items-center gap-1">
            <AlertTriangle size={10} />{criticalCount}
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2 min-h-[80px] overflow-y-auto max-h-[calc(100vh-220px)]">
        {tickets.map(ticket => (
          <div
            key={ticket.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('ticketId', ticket.id)}
          >
            <KanbanCard
              ticket={ticket}
              getSlaInfo={getSlaInfo}
              onClick={() => onCardClick(ticket.id)}
            />
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="text-center py-6 text-xs text-gray-400">Sem tickets</div>
        )}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const navigate = useNavigate()
  const { tickets, loading, refetch } = useTickets()
  const { getSlaInfo } = useSla()

  const criticalTotal = tickets.filter(t =>
    !['encerrado', 'recusado'].includes(t.status) &&
    getSlaInfo(t.status, t.created_at).status === 'critical'
  ).length

  async function handleDrop(ticketId: string, newStatus: TicketStatus) {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket || ticket.status === newStatus) return
    await updateTicketStatus(ticketId, newStatus)
    refetch()
  }

  const columnTickets = (status: TicketStatus) =>
    tickets.filter(t => t.status === status)

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
          {criticalTotal > 0 && (
            <span className="badge bg-red-100 text-red-700 flex items-center gap-1 cursor-pointer"
              onClick={() => {}}>
              <AlertTriangle size={13} />
              {criticalTotal} com SLA estourado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="btn-ghost text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => navigate('/pedidos')} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={15} /> Novo Ticket
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={28} className="animate-spin text-zf-blue" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="card p-16 text-center text-gray-400 space-y-3">
          <p className="font-medium text-gray-600">Nenhum ticket aberto</p>
          <p className="text-sm">Crie o primeiro ticket selecionando um pedido</p>
          <button onClick={() => navigate('/pedidos')} className="btn-primary text-sm mx-auto">
            <Plus size={14} className="inline mr-1" /> Novo Ticket
          </button>
        </div>
      ) : (
        /* Colunas do Kanban — scroll horizontal */
        <div className="flex gap-3 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tickets={columnTickets(status)}
              getSlaInfo={getSlaInfo}
              onCardClick={id => navigate(`/tickets/${id}`)}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
