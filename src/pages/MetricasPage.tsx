import { useState } from 'react'
import { RefreshCw, TrendingDown, Clock, CheckCircle, AlertCircle, BarChart2 } from 'lucide-react'
import { useMetrics } from '@/hooks/useMetrics'

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

export default function MetricasPage() {
  const [period, setPeriod] = useState(30)
  const { summary, loading } = useMetrics(period)

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
