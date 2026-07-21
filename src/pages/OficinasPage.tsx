import { useState, useEffect } from 'react'
import { Search, RefreshCw, Building2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { db } from '@/lib/db'
import { formatarCNPJ } from '@/lib/formatters'
import { STATUS_LABELS } from '@/types'
import type { TicketStatus } from '@/types'

interface OficinaSummary {
  company_name: string
  company_cnpj: string
  order_city: string
  order_state: string
  total_tickets: number
  abertos: number
  encerrados: number
  recusados: number
  ultimo_ticket: string
}

interface TicketResumo {
  id: string
  ticket_number: number
  order_id: string
  tipo: string
  status: string
  merchant_name: string
  motivo: string
  created_at: string
  data_solicitacao: string
  itens: string[]
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    aberto: 'bg-blue-100 text-blue-700',
    contato_enviado: 'bg-cyan-100 text-cyan-700',
    aguardando_autorizacao: 'bg-amber-100 text-amber-700',
    autorizado: 'bg-green-100 text-green-700',
    nfd_pendente: 'bg-orange-100 text-orange-700',
    logistica_reversa_concluida: 'bg-purple-100 text-purple-700',
    encerrado: 'bg-gray-100 text-gray-600',
    recusado: 'bg-red-100 text-red-700',
  }
  return (
    <span className={'badge text-xs ' + (colors[status] ?? 'bg-gray-100 text-gray-500')}>
      {STATUS_LABELS[status as TicketStatus] ?? status.replace(/_/g, ' ')}
    </span>
  )
}

function OficinaCard({ oficina }: { oficina: OficinaSummary }) {
  const [expanded, setExpanded] = useState(false)
  const [tickets, setTickets] = useState<TicketResumo[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  async function loadTickets() {
    if (tickets.length > 0) { setExpanded(!expanded); return }
    setLoadingTickets(true)
    setExpanded(true)

    const { data: tks } = await db
      .from('tickets')
      .select('id, ticket_number, order_id, tipo, status, merchant_name, motivo, created_at, data_solicitacao')
      .eq('company_cnpj', oficina.company_cnpj)
      .order('created_at', { ascending: false })

    if (!tks || tks.length === 0) { setLoadingTickets(false); return }

    // Busca itens de cada ticket
    const ids = (tks as any[]).map((t: any) => t.id)
    const { data: items } = await db
      .from('ticket_items')
      .select('ticket_id, item_name')
      .in('ticket_id', ids)

    const itemsMap = new Map<string, string[]>()
    for (const item of (items ?? []) as any[]) {
      if (!itemsMap.has(item.ticket_id)) itemsMap.set(item.ticket_id, [])
      itemsMap.get(item.ticket_id)!.push(item.item_name)
    }

    setTickets((tks as any[]).map((t: any) => ({
      ...t,
      itens: itemsMap.get(t.id) ?? [],
    })))
    setLoadingTickets(false)
  }

  return (
    <div className="card overflow-hidden">
      {/* Header da oficina */}
      <div
        className="px-5 py-4 flex items-start justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={loadTickets}
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zf-blue-light flex items-center justify-center shrink-0 mt-0.5">
            <Building2 size={18} className="text-zf-blue" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{oficina.company_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatarCNPJ(oficina.company_cnpj)}
              {oficina.order_city ? ' · ' + oficina.order_city : ''}
              {oficina.order_state ? ' / ' + oficina.order_state : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-2 text-xs">
            <span className="badge bg-blue-100 text-blue-700">{oficina.abertos} aberto{oficina.abertos !== 1 ? 's' : ''}</span>
            {oficina.encerrados > 0 && <span className="badge bg-gray-100 text-gray-600">{oficina.encerrados} encerrado{oficina.encerrados !== 1 ? 's' : ''}</span>}
            {oficina.recusados > 0 && <span className="badge bg-red-100 text-red-700">{oficina.recusados} recusado{oficina.recusados !== 1 ? 's' : ''}</span>}
          </div>
          <div className="text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Tickets expandidos */}
      {expanded && (
        <div className="border-t border-gray-100">
          {loadingTickets ? (
            <div className="flex justify-center py-6">
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum ticket encontrado</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Ticket</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Pedido</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Seller</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Itens</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Motivo</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Data</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <span className="font-mono font-bold text-zf-blue">T#{t.ticket_number}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-gray-600">#{t.order_id}</td>
                    <td className="px-5 py-3 text-gray-700 max-w-[120px] truncate">{t.merchant_name}</td>
                    <td className="px-5 py-3 max-w-[160px]">
                      {t.itens.length > 0 ? (
                        <div className="space-y-0.5">
                          {t.itens.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-gray-600 truncate">{item}</p>
                          ))}
                          {t.itens.length > 2 && (
                            <p className="text-xs text-gray-400">+{t.itens.length - 2} item{t.itens.length - 2 > 1 ? 's' : ''}</p>
                          )}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 max-w-[140px]">
                      <p className="text-xs text-gray-600 truncate">{t.motivo}</p>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(t.data_solicitacao || t.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3">
                      <a href={'/tickets/' + t.id} className="text-zf-blue hover:underline text-xs flex items-center gap-1">
                        Abrir <ExternalLink size={11} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default function OficinasPage() {
  const [search, setSearch] = useState('')
  const [oficinas, setOficinas] = useState<OficinaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'com_abertos'>('todas')

  async function load() {
    setLoading(true)

    // Busca paginada — evita truncamento silencioso quando o volume ultrapassar 1000 tickets
    const PAGE_SIZE = 1000
    let tickets: any[] = []
    let from = 0
    while (true) {
      const { data: page } = await db
        .from('tickets')
        .select('company_name, company_cnpj, order_city, order_state, status, created_at')
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1)
      if (!page || page.length === 0) break
      tickets = tickets.concat(page)
      if (page.length < PAGE_SIZE) break
      from += PAGE_SIZE
    }

    if (tickets.length === 0) { setLoading(false); return }

    // Agrupa por CNPJ
    const map = new Map<string, OficinaSummary>()
    for (const t of tickets as any[]) {
      const cnpj = t.company_cnpj ?? ''
      if (!map.has(cnpj)) {
        map.set(cnpj, {
          company_name: t.company_name ?? '',
          company_cnpj: cnpj,
          order_city: t.order_city ?? '',
          order_state: t.order_state ?? '',
          total_tickets: 0,
          abertos: 0,
          encerrados: 0,
          recusados: 0,
          ultimo_ticket: t.created_at,
        })
      }
      const o = map.get(cnpj)!
      o.total_tickets++
      if (t.status === 'encerrado') o.encerrados++
      else if (t.status === 'recusado') o.recusados++
      else o.abertos++
    }

    setOficinas(Array.from(map.values()).sort((a, b) => b.abertos - a.abertos || b.total_tickets - a.total_tickets))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = oficinas.filter(o => {
    const matchSearch = !search ||
      o.company_name.toLowerCase().includes(search.toLowerCase()) ||
      o.company_cnpj.includes(search.replace(/\D/g, ''))
    const matchFilter = filter === 'todas' || o.abertos > 0
    return matchSearch && matchFilter
  })

  const comAbertos = oficinas.filter(o => o.abertos > 0).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oficinas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historico de devolvucoes por cliente
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar oficina por nome ou CNPJ..."
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['todas', 'com_abertos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={'text-sm px-3 py-2 rounded-lg border transition-colors ' +
                (filter === f ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300')}
            >
              {f === 'todas' ? 'Todas (' + oficinas.length + ')' : 'Com abertos (' + comAbertos + ')'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-zf-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-2">
          <Building2 size={32} className="mx-auto text-gray-300" />
          <p className="font-medium text-gray-600">
            {search ? 'Nenhuma oficina encontrada' : 'Nenhuma oficina com tickets ainda'}
          </p>
          <p className="text-sm">As oficinas aparecem automaticamente quando tickets sao criados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => (
            <OficinaCard key={o.company_cnpj} oficina={o} />
          ))}
        </div>
      )}
    </div>
  )
}
