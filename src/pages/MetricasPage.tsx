import { useState, useEffect } from 'react'
import { RefreshCw, TrendingDown, Clock, CheckCircle, AlertCircle, BarChart2, Trophy } from 'lucide-react'
import { useMetrics } from '@/hooks/useMetrics'
import { db } from '@/lib/db'


interface SkuVolume {
  item_sku: string
  item_name: string
  total: number
}

interface ClienteReincidencia {
  company_name: string
  company_cnpj: string
  total_tickets: number
  periodos: number
}

function useMetricasEstrategicas(dateFrom: string, dateTo: string) {
  const [volumeSku, setVolumeSku] = useState<SkuVolume[]>([])
  const [reincidentes, setReincidentes] = useState<ClienteReincidencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const since = new Date(dateFrom + 'T00:00:00').toISOString()
      const until = new Date(dateTo + 'T23:59:59').toISOString()

      // 2. Volume por SKU
      const { data: allTickets } = await db
        .from('tickets')
        .select('id')
        .gte('created_at', since)
        .lte('created_at', until)

      if (allTickets && allTickets.length > 0) {
        const ids = (allTickets as any[]).map((t: any) => t.id)
        const { data: items } = await db
          .from('ticket_items')
          .select('item_sku, item_name')
          .in('ticket_id', ids)

        const skuMap = new Map<string, { item_name: string; total: number }>()
        for (const i of (items ?? []) as any[]) {
          if (!skuMap.has(i.item_sku)) skuMap.set(i.item_sku, { item_name: i.item_name, total: 0 })
          skuMap.get(i.item_sku)!.total++
        }
        setVolumeSku(
          Array.from(skuMap.entries())
            .map(([item_sku, v]) => ({ item_sku, ...v }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
        )
      }

      // 3. Taxa de reincidencia — clientes com 2+ tickets no periodo
      const { data: ticketsClientes } = await db
        .from('tickets')
        .select('company_name, company_cnpj, created_at')
        .gte('created_at', since)
        .lte('created_at', until)

      const clienteMap = new Map<string, { company_name: string; company_cnpj: string; total: number }>()
      for (const t of (ticketsClientes ?? []) as any[]) {
        const key = t.company_cnpj || t.company_name
        if (!clienteMap.has(key)) clienteMap.set(key, { company_name: t.company_name, company_cnpj: t.company_cnpj, total: 0 })
        clienteMap.get(key)!.total++
      }
      setReincidentes(
        Array.from(clienteMap.values())
          .filter(c => c.total >= 2)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)
          .map(c => ({ ...c, total_tickets: c.total, periodos: c.total }))
      )

      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo])

  return { volumeSku, reincidentes, loading }
}

function MetricCard({
  label, value, sub, color, icon
}: {
  label: string
  value: string
  sub?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className={`card p-5 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className="text-gray-300">{icon}</div>
      </div>
    </div>
  )
}

function formatHoras(h: number | null): string {
  if (h === null) return '—'
  if (h < 24) return h.toFixed(1) + 'h'
  return (h / 24).toFixed(1) + ' dias'
}

function getColorMTTR(horas: number | null, limiteOk: number, limiteCritico: number): string {
  if (horas === null) return 'text-gray-400'
  if (horas <= limiteOk) return 'text-green-600'
  if (horas <= limiteCritico) return 'text-amber-600'
  return 'text-red-600'
}

interface RankingItem {
  name: string
  total: number
  abertos: number
  encerrados: number
  recusados: number
}

function useRankings(dateFrom: string, dateTo: string) {
  const [sellers, setSellers] = useState<RankingItem[]>([])
  const [oficinas, setOficinas] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const since = new Date(dateFrom + 'T00:00:00').toISOString()
      const until = new Date(dateTo + 'T23:59:59').toISOString()
      const { data } = await (await import('@/lib/db')).db
        .from('tickets')
        .select('merchant_name, company_name, status')
        .gte('created_at', since)
        .lte('created_at', until)

      if (!data) { setLoading(false); return }

      // Rankings por seller
      const sellerMap = new Map<string, RankingItem>()
      const oficinaMap = new Map<string, RankingItem>()

      for (const t of data as any[]) {
        // Seller
        const sn = t.merchant_name || 'Sem seller'
        if (!sellerMap.has(sn)) sellerMap.set(sn, { name: sn, total: 0, abertos: 0, encerrados: 0, recusados: 0 })
        const s = sellerMap.get(sn)!
        s.total++
        if (t.status === 'encerrado') s.encerrados++
        else if (t.status === 'recusado') s.recusados++
        else s.abertos++

        // Oficina
        const on = t.company_name || 'Sem cliente'
        if (!oficinaMap.has(on)) oficinaMap.set(on, { name: on, total: 0, abertos: 0, encerrados: 0, recusados: 0 })
        const o = oficinaMap.get(on)!
        o.total++
        if (t.status === 'encerrado') o.encerrados++
        else if (t.status === 'recusado') o.recusados++
        else o.abertos++
      }

      setSellers(Array.from(sellerMap.values()).sort((a, b) => b.total - a.total).slice(0, 10))
      setOficinas(Array.from(oficinaMap.values()).sort((a, b) => b.total - a.total).slice(0, 10))
      setLoading(false)
    }
    load()
  }, [dateFrom, dateTo])

  return { sellers, oficinas, loading }
}

function RankingTable({ items, label }: { items: RankingItem[], label: string }) {
  if (items.length === 0) return (
    <p className="text-sm text-gray-400 text-center py-6">Nenhum dado no período</p>
  )
  return (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">#</th>
          <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">{label}</th>
          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Abertos</th>
          <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Encerrados</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {items.map((item, i) => (
          <tr key={item.name} className="hover:bg-gray-50">
            <td className="px-4 py-2.5">
              <span className={`font-bold text-xs ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
              </span>
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">{item.name}</td>
            <td className="px-4 py-2.5 text-right font-bold text-gray-900">{item.total}</td>
            <td className="px-4 py-2.5 text-right">
              {item.abertos > 0
                ? <span className="badge bg-amber-100 text-amber-700">{item.abertos}</span>
                : <span className="text-gray-300">—</span>}
            </td>
            <td className="px-4 py-2.5 text-right">
              {item.encerrados > 0
                ? <span className="badge bg-green-100 text-green-700">{item.encerrados}</span>
                : <span className="text-gray-300">—</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function MetricasPage() {
  const [period, setPeriod] = useState(30)
  const { summary, loading } = useMetrics(period)
  const { sellers: rankingSellers, oficinas: rankingOficinas, loading: loadingRanking } = useRankings(period)
  const { volumeSku, reincidentes, loading: loadingEstrategico } = useMetricasEstrategicas(period)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metricas</h1>
          <p className="text-sm text-gray-500 mt-0.5">MTTR e volume de tickets de devolucao</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(Number(e.target.value))}
          className="input w-44 text-sm"
        >
          <option value={7}>Ultimos 7 dias</option>
          <option value={15}>Ultimos 15 dias</option>
          <option value={30}>Ultimos 30 dias</option>
          <option value={60}>Ultimos 60 dias</option>
          <option value={90}>Ultimos 90 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={28} className="animate-spin text-zf-blue" />
        </div>
      ) : !summary ? (
        <div className="card p-12 text-center text-gray-400">Erro ao carregar metricas</div>
      ) : (
        <>
          {/* Cards de volume */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Total de Tickets"
              value={String(summary.total_tickets)}
              sub={`Ultimos ${period} dias`}
              color="border-zf-blue"
              icon={<BarChart2 size={32} />}
            />
            <MetricCard
              label="Em Aberto"
              value={String(summary.abertos)}
              sub="Aguardando resolucao"
              color="border-amber-400"
              icon={<AlertCircle size={32} />}
            />
            <MetricCard
              label="Encerrados"
              value={String(summary.encerrados)}
              sub="Estorno realizado"
              color="border-green-400"
              icon={<CheckCircle size={32} />}
            />
          </div>

          {/* Cards de MTTR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-zf-blue" />
                <h2 className="font-semibold text-gray-800">MTTR — Autorizacao do Seller</h2>
              </div>
              <p className="text-xs text-gray-500">
                Tempo medio entre abertura do ticket e status "Autorizado"
              </p>
              {summary.mttr_autorizacao_media_horas === null ? (
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-gray-300">—</p>
                  <p className="text-xs text-gray-400 mt-1">Nenhum ticket autorizado ainda</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className={`text-4xl font-bold ${getColorMTTR(summary.mttr_autorizacao_media_horas, 24, 72)}`}>
                    {formatHoras(summary.mttr_autorizacao_media_horas)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {summary.mttr_autorizacao_media_dias !== null &&
                      summary.mttr_autorizacao_media_horas! >= 24 &&
                      `${summary.mttr_autorizacao_media_horas}h`}
                  </p>
                </div>
              )}
              <div className="flex gap-3 text-xs justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Ate 24h ideal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>24-72h atencao</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Acima de 72h critico</span>
              </div>
            </div>

            <div className="card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-purple-600" />
                <h2 className="font-semibold text-gray-800">MTTR — Logistica Reversa</h2>
              </div>
              <p className="text-xs text-gray-500">
                Tempo medio entre abertura do ticket e status "Logistica Reversa Concluida"
              </p>
              {summary.mttr_logistica_media_horas === null ? (
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-gray-300">—</p>
                  <p className="text-xs text-gray-400 mt-1">Nenhuma logistica concluida ainda</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className={`text-4xl font-bold ${getColorMTTR(summary.mttr_logistica_media_horas, 72, 168)}`}>
                    {formatHoras(summary.mttr_logistica_media_horas)}
                  </p>
                </div>
              )}
              <div className="flex gap-3 text-xs justify-center">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>Ate 3 dias ideal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>3-7 dias atencao</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>Acima de 7 dias critico</span>
              </div>
            </div>
          </div>

          {/* Tabela de tickets com MTTR individual */}
          {summary.tickets.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Detalhamento por Ticket</h2>
                <span className="text-xs text-gray-400">{summary.tickets.length} tickets</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Ticket</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Pedido</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Seller</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">MTTR Aut.</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">MTTR Log.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.tickets.map(t => (
                      <tr key={t.ticket_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <a href={`/tickets/${t.ticket_id}`} className="font-mono font-bold text-zf-blue hover:underline">
                            T#{t.ticket_number}
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600">#{t.order_id}</td>
                        <td className="px-4 py-3 text-gray-800 max-w-[140px] truncate">{t.company_name}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{t.merchant_name}</td>
                        <td className="px-4 py-3">
                          <span className={`badge text-xs ${t.tipo === 'garantia' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {t.tipo === 'garantia' ? 'G' : 'D'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600">{t.status.replace(/_/g, ' ')}</span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${getColorMTTR(t.mttr_autorizacao_horas, 24, 72)}`}>
                          {formatHoras(t.mttr_autorizacao_horas)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${getColorMTTR(t.mttr_logistica_horas, 72, 168)}`}>
                          {formatHoras(t.mttr_logistica_horas)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h2 className="font-semibold text-gray-800">Sellers com mais devoluções</h2>
                <span className="text-xs text-gray-400 ml-auto">Top 10 · {period} dias</span>
              </div>
              {loadingRanking
                ? <div className="flex justify-center py-8"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
                : <RankingTable items={rankingSellers} label="Seller" />}
            </div>
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Trophy size={16} className="text-amber-500" />
                <h2 className="font-semibold text-gray-800">Oficinas com mais devoluções</h2>
                <span className="text-xs text-gray-400 ml-auto">Top 10 · {period} dias</span>
              </div>
              {loadingRanking
                ? <div className="flex justify-center py-8"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
                : <RankingTable items={rankingOficinas} label="Oficina" />}
            </div>
          </div>

          {/* Metricas estrategicas */}
          <div className="space-y-5">

            {/* Volume por SKU */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" />
                <h2 className="font-semibold text-gray-800">Peças com Mais Devoluções</h2>
                <span className="text-xs text-gray-400 ml-auto">Top 10 SKUs · {period} dias</span>
              </div>
              {loadingEstrategico
                ? <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
                : volumeSku.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Nenhum dado no período</p>
                  : <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">#</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Peça</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">SKU</th>
                          <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Ocorrências</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {volumeSku.map((s, i) => (
                          <tr key={s.item_sku} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5 text-gray-400 text-xs">{i + 1}º</td>
                            <td className="px-5 py-2.5 text-gray-800 max-w-[240px] truncate">{s.item_name}</td>
                            <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{s.item_sku}</td>
                            <td className="px-5 py-2.5 text-right">
                              <span className={`badge text-xs font-bold ${
                                s.total >= 5 ? 'bg-red-100 text-red-700' :
                                s.total >= 3 ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{s.total}×</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              }
            </div>

            {/* Reincidencia de clientes */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingDown size={16} className="text-red-500" />
                <h2 className="font-semibold text-gray-800">Clientes Reincidentes</h2>
                <span className="text-xs text-gray-400 ml-auto">2+ tickets no período · {period} dias</span>
              </div>
              {loadingEstrategico
                ? <div className="flex justify-center py-6"><RefreshCw size={16} className="animate-spin text-gray-400" /></div>
                : reincidentes.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">Nenhum cliente reincidente no período</p>
                  : <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">Cliente</th>
                          <th className="text-left px-5 py-2 text-xs font-medium text-gray-500">CNPJ</th>
                          <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Tickets abertos</th>
                          <th className="text-right px-5 py-2 text-xs font-medium text-gray-500">Risco</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {reincidentes.map(c => (
                          <tr key={c.company_cnpj || c.company_name} className="hover:bg-gray-50">
                            <td className="px-5 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">{c.company_name}</td>
                            <td className="px-5 py-2.5 text-xs text-gray-500">{c.company_cnpj}</td>
                            <td className="px-5 py-2.5 text-right font-bold text-gray-900">{c.total_tickets}</td>
                            <td className="px-5 py-2.5 text-right">
                              <span className={`badge text-xs font-bold ${
                                c.total_tickets >= 5 ? 'bg-red-100 text-red-700' :
                                c.total_tickets >= 3 ? 'bg-amber-100 text-amber-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{c.total_tickets >= 5 ? 'Alto' : c.total_tickets >= 3 ? 'Médio' : 'Baixo'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
              }
            </div>
          </div>

          {summary.total_tickets === 0 && (
            <div className="card p-12 text-center text-gray-400 space-y-2">
              <BarChart2 size={32} className="mx-auto text-gray-300" />
              <p className="font-medium text-gray-600">Nenhum ticket no periodo selecionado</p>
              <p className="text-sm">As metricas aparecerao conforme os tickets forem sendo criados e processados</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
