import { useState, useEffect } from 'react'
import { Search, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Building2 } from 'lucide-react'
import { db } from '@/lib/db'
import { STATUS_LABELS } from '@/types'
import type { TicketStatus } from '@/types'

const STATUS_EXCLUIDOS: TicketStatus[] = ['encerrado', 'recusado']

interface TicketResumo {
  id: string
  ticket_number: number
  order_id: string
  tipo: string
  status: TicketStatus
  merchant_name: string
  motivo: string
  itens: { item_name: string; qtd_devolvida: number }[]
}

interface ClienteAgrupado {
  company_name: string
  company_cnpj: string
  tickets: TicketResumo[]
}

function gerarMensagem(cliente: ClienteAgrupado): string {
  const data = new Date().toLocaleDateString('pt-BR')
  let msg = `Prezado(a) *${cliente.company_name}*,\n\n`
  msg += `Seguem as atualizações das suas solicitações em aberto junto ao [pro]Parts em ${data}:\n`

  cliente.tickets.forEach((t, idx) => {
    msg += `\n${idx + 1}. *Pedido ${t.order_id}* — Ticket #${t.ticket_number}\n`
    msg += `   Seller: ${t.merchant_name}\n`
    if (t.itens.length > 0) {
      msg += `   Itens:\n`
      t.itens.forEach(i => {
        msg += `   • ${i.item_name} (Qtd: ${i.qtd_devolvida})\n`
      })
    }
    msg += `   Tipo: ${t.tipo === 'garantia' ? 'Garantia' : 'Devolução'}\n`
    msg += `   Status: *${STATUS_LABELS[t.status] ?? t.status}*\n`
    if (t.motivo) msg += `   Motivo: ${t.motivo}\n`
  })

  msg += `\nQualquer dúvida, estamos à disposição.\n`
  msg += `*[pro]Parts — Equipe de Atendimento*`
  return msg
}

function ClienteCard({ cliente }: { cliente: ClienteAgrupado }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  function copiar() {
    navigator.clipboard.writeText(gerarMensagem(cliente))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const statusCount: Record<string, number> = {}
  cliente.tickets.forEach(t => {
    const label = STATUS_LABELS[t.status] ?? t.status
    statusCount[label] = (statusCount[label] ?? 0) + 1
  })

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div
          className="flex items-start gap-3 flex-1 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="w-9 h-9 rounded-lg bg-zf-blue-light flex items-center justify-center shrink-0 mt-0.5">
            <Building2 size={18} className="text-zf-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{cliente.company_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cliente.company_cnpj}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(statusCount).map(([label, count]) => (
                <span key={label} className="badge bg-gray-100 text-gray-600 text-xs">
                  {count}× {label}
                </span>
              ))}
            </div>
          </div>
          <div className="text-gray-400 shrink-0 mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
        <button
          onClick={copiar}
          className={'flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors shrink-0 ' +
            (copied
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-600 hover:border-zf-blue hover:text-zf-blue')}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar msg'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {/* Preview da mensagem */}
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Preview da mensagem:</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {gerarMensagem(cliente)}
            </pre>
          </div>

          {/* Tabela de tickets */}
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Ticket</th>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Pedido</th>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Seller</th>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Itens</th>
                <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cliente.tickets.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-2.5">
                    <a href={`/tickets/${t.id}`} className="font-mono font-bold text-zf-blue hover:underline text-xs">
                      T#{t.ticket_number}
                    </a>
                  </td>
                  <td className="px-5 py-2.5 font-mono text-xs text-gray-600">#{t.order_id}</td>
                  <td className="px-5 py-2.5 text-xs text-gray-700 max-w-[120px] truncate">{t.merchant_name}</td>
                  <td className="px-5 py-2.5 max-w-[200px]">
                    {t.itens.slice(0, 2).map((item, i) => (
                      <p key={i} className="text-xs text-gray-600 truncate">{item.item_name} ({item.qtd_devolvida})</p>
                    ))}
                    {t.itens.length > 2 && <p className="text-xs text-gray-400">+{t.itens.length - 2} item(s)</p>}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="badge text-xs bg-blue-50 text-blue-700">
                      {STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteAgrupado[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)

    const { data: tickets } = await db
      .from('tickets')
      .select('id, ticket_number, order_id, tipo, status, merchant_name, motivo, company_name, company_cnpj')
      .not('status', 'in', `(${STATUS_EXCLUIDOS.map(s => `"${s}"`).join(',')})`)
      .order('company_name')

    if (!tickets || tickets.length === 0) { setLoading(false); return }

    const ids = (tickets as any[]).map((t: any) => t.id)
    const { data: items } = await db
      .from('ticket_items')
      .select('ticket_id, item_name, qtd_devolvida')
      .in('ticket_id', ids)

    const itemsMap = new Map<string, { item_name: string; qtd_devolvida: number }[]>()
    for (const item of (items ?? []) as any[]) {
      if (!itemsMap.has(item.ticket_id)) itemsMap.set(item.ticket_id, [])
      itemsMap.get(item.ticket_id)!.push({ item_name: item.item_name, qtd_devolvida: item.qtd_devolvida })
    }

    const clienteMap = new Map<string, ClienteAgrupado>()
    for (const t of tickets as any[]) {
      const key = t.company_cnpj || t.company_name
      if (!clienteMap.has(key)) {
        clienteMap.set(key, {
          company_name: t.company_name,
          company_cnpj: t.company_cnpj ?? '',
          tickets: [],
        })
      }
      clienteMap.get(key)!.tickets.push({
        id: t.id,
        ticket_number: t.ticket_number,
        order_id: t.order_id,
        tipo: t.tipo,
        status: t.status,
        merchant_name: t.merchant_name,
        motivo: t.motivo,
        itens: itemsMap.get(t.id) ?? [],
      })
    }

    setClientes(Array.from(clienteMap.values()).sort((a, b) => a.company_name.localeCompare(b.company_name)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = clientes.filter(c =>
    !search || c.company_name.toLowerCase().includes(search.toLowerCase()) ||
    c.company_cnpj.includes(search.replace(/\D/g, ''))
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Consolidação de pendências por cliente com geração de mensagem
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente por nome ou CNPJ..."
            className="input pl-9"
          />
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
            {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente com tickets abertos'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''} com tickets abertos</p>
          {filtered.map(c => (
            <ClienteCard key={c.company_cnpj || c.company_name} cliente={c} />
          ))}
        </div>
      )}
    </div>
  )
}
