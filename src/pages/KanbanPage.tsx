import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, AlertTriangle, RefreshCw, Search, X } from 'lucide-react'
import { useTickets, updateTicketStatus } from '@/hooks/useTickets'
import { db } from '@/lib/db'
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

const COLUNAS_ATIVAS: TicketStatus[] = [
  'aberto', 'contato_enviado', 'aguardando_autorizacao',
  'autorizado', 'nfd_pendente', 'logistica_reversa_concluida'
]

export default function KanbanPage() {
  const navigate = useNavigate()
  const { tickets, loading, refetch } = useTickets()
  const { getSlaInfo } = useSla()
  // Filtros persistidos em localStorage — sobrevivem à navegação
  const [filtroSemAtividade, setFiltroSemAtividadeRaw] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('kanban_filtro_atividade') ?? 'false') } catch { return false }
  })
  const [ticketsSemAtividadeHoje, setTicketsSemAtividadeHoje] = useState<Set<string>>(new Set())
  const [filtroTipo, setFiltroTipoRaw] = useState<'todos' | 'devolucao' | 'garantia'>(() => {
    try { return (localStorage.getItem('kanban_filtro_tipo') as 'todos' | 'devolucao' | 'garantia') ?? 'todos' } catch { return 'todos' }
  })
  const [filtroSla, setFiltroSlaRaw] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('kanban_filtro_sla') ?? 'false') } catch { return false }
  })
  const [busca, setBuscaRaw] = useState<string>(() => {
    try { return localStorage.getItem('kanban_busca') ?? '' } catch { return '' }
  })

  // Wrappers que persistem ao setar
  function setFiltroSemAtividade(v: boolean | ((prev: boolean) => boolean)) {
    setFiltroSemAtividadeRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try { localStorage.setItem('kanban_filtro_atividade', JSON.stringify(next)) } catch {}
      return next
    })
  }
  function setFiltroTipo(v: 'todos' | 'devolucao' | 'garantia') {
    setFiltroTipoRaw(v)
    try { localStorage.setItem('kanban_filtro_tipo', v) } catch {}
  }
  function setFiltroSla(v: boolean | ((prev: boolean) => boolean)) {
    setFiltroSlaRaw(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      try { localStorage.setItem('kanban_filtro_sla', JSON.stringify(next)) } catch {}
      return next
    })
  }
  function setBusca(v: string) {
    setBuscaRaw(v)
    try { localStorage.setItem('kanban_busca', v) } catch {}
  }

  // Busca tickets ativos que tiveram log hoje
  useEffect(() => {
    async function loadAtividade() {
      const hoje = new Date()
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()

      const STATUS_FINAIS = ['encerrado', 'recusado']
      const idsAtivos = tickets
        .filter(t => COLUNAS_ATIVAS.includes(t.status as TicketStatus) && !STATUS_FINAIS.includes(t.status))
        .map(t => t.id)

      if (idsAtivos.length === 0) { setTicketsSemAtividadeHoje(new Set()); return }

      const { data: logsHoje } = await db
        .from('ticket_logs')
        .select('ticket_id')
        .in('ticket_id', idsAtivos)
        .gte('created_at', inicioHoje)

      const comAtividade = new Set(((logsHoje ?? []) as { ticket_id: string }[]).map(l => l.ticket_id))
      const semAtividade = new Set(idsAtivos.filter(id => !comAtividade.has(id)))
      setTicketsSemAtividadeHoje(semAtividade)
    }
    if (!loading) loadAtividade()
  }, [tickets, loading])

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

  const filtrosAtivos = (filtroSemAtividade ? 1 : 0) +
    (filtroTipo !== 'todos' ? 1 : 0) +
    (filtroSla ? 1 : 0) +
    (busca.trim() ? 1 : 0)

  const columnTickets = (status: TicketStatus) => {
    let base = tickets.filter(t => t.status === status)

    // Filtro sem atividade hoje (apenas colunas ativas)
    if (filtroSemAtividade && COLUNAS_ATIVAS.includes(status)) {
      base = base.filter(t => ticketsSemAtividadeHoje.has(t.id))
    }
    // Filtro por tipo
    if (filtroTipo !== 'todos') {
      base = base.filter(t => t.tipo === filtroTipo)
    }
    // Filtro SLA estourado (apenas colunas ativas)
    if (filtroSla && COLUNAS_ATIVAS.includes(status)) {
      base = base.filter(t => getSlaInfo(t.status, t.created_at).status === 'critical')
    }
    // Busca unificada: seller, cliente ou pedido
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      base = base.filter(t =>
        (t.merchant_name ?? '').toLowerCase().includes(q) ||
        (t.merchant_reference ?? '').toLowerCase().includes(q) ||
        (t.company_name ?? '').toLowerCase().includes(q) ||
        String(t.order_id ?? '').includes(q) ||
        String(t.ticket_number ?? '').includes(q)
      )
    }

    return base
  }

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

      {/* Barra de filtros sempre visivel */}
      <div className="card px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">

          {/* Tipo */}
          <div className="flex gap-1">
            {(['todos', 'devolucao', 'garantia'] as const).map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)}
                className={'text-xs px-2.5 py-1.5 rounded-lg border transition-colors ' +
                  (filtroTipo === t
                    ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                {t === 'todos' ? 'Todos' : t === 'devolucao' ? 'Dev.' : 'Gar.'}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* SLA */}
          <button onClick={() => setFiltroSla(f => !f)}
            className={'text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ' +
              (filtroSla ? 'border-red-400 bg-red-50 text-red-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            <AlertTriangle size={11} /> SLA estourado
          </button>

          {/* Sem atividade */}
          <button onClick={() => setFiltroSemAtividade(f => !f)}
            className={'text-xs px-2.5 py-1.5 rounded-lg border transition-colors ' +
              (filtroSemAtividade ? 'border-amber-400 bg-amber-50 text-amber-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
            Sem atividade hoje
            {filtroSemAtividade && ticketsSemAtividadeHoje.size > 0 && (
              <span className="ml-1 font-bold">({ticketsSemAtividadeHoje.size})</span>
            )}
          </button>

          <div className="w-px h-5 bg-gray-200" />

          {/* Busca unificada */}
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Seller, cliente ou pedido..."
              className="border border-gray-200 rounded-lg pl-6 pr-6 py-1.5 text-xs focus:outline-none focus:border-zf-blue w-52" />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={11} />
              </button>
            )}
          </div>

          {/* Limpar tudo */}
          {filtrosAtivos > 0 && (
            <>
              <div className="w-px h-5 bg-gray-200" />
              <button
                onClick={() => { setFiltroSemAtividade(false); setFiltroTipo('todos'); setFiltroSla(false); setBusca('') }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1.5">
                <X size={11} /> Limpar ({filtrosAtivos})
              </button>
            </>
          )}
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
          {KANBAN_COLUMNS
          .filter(status => {
            // Quando filtro sem atividade ativo, oculta encerrado e recusado
            if (filtroSemAtividade && (status === 'encerrado' || status === 'recusado')) return false
            return true
          })
          .map(status => (
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
