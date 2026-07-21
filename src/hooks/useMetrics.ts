import { useState, useEffect } from 'react'
import { db } from '@/lib/db'

export interface TicketMetric {
  ticket_id: string
  ticket_number: number
  order_id: string
  company_name: string
  merchant_name: string
  tipo: string
  created_at: string
  mttr_autorizacao_horas: number | null
  mttr_logistica_horas: number | null
  status: string
}

export interface MetricsSummary {
  total_tickets: number
  abertos: number
  encerrados: number
  mttr_autorizacao_media_horas: number | null
  mttr_autorizacao_media_dias: number | null
  mttr_logistica_media_horas: number | null
  mttr_logistica_media_dias: number | null
  tickets: TicketMetric[]
}

export function useMetrics(dateFrom: string, dateTo: string) {
  const [summary, setSummary] = useState<MetricsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const since = new Date(dateFrom + 'T00:00:00').toISOString()
        const until = new Date(dateTo + 'T23:59:59').toISOString()

        // Busca todos os tickets do periodo
        const { data: tickets } = await db
          .from('tickets')
          .select('id, ticket_number, order_id, company_name, merchant_name, tipo, status, created_at')
          .gte('created_at', since)
          .lte('created_at', until)
          .order('created_at', { ascending: false })

        if (!tickets || tickets.length === 0) {
          setSummary({
            total_tickets: 0, abertos: 0, encerrados: 0,
            mttr_autorizacao_media_horas: null, mttr_autorizacao_media_dias: null,
            mttr_logistica_media_horas: null, mttr_logistica_media_dias: null,
            tickets: [],
          })
          setLoading(false)
          return
        }

        const ids = (tickets as any[]).map((t: any) => t.id)

        // Busca logs de mudança de status para autorizado e logistica_reversa_concluida
        const { data: logs } = await db
          .from('ticket_logs')
          .select('ticket_id, mensagem, created_at')
          .in('ticket_id', ids)
          .or('mensagem.ilike.%autorizado%,mensagem.ilike.%logistica_reversa_concluida%,mensagem.ilike.%Logistica Reversa%')
          .order('created_at', { ascending: true })

        // Mapeia primeiro log de autorização e logística por ticket
        const autorizacaoMap = new Map<string, string>()
        const logisticaMap = new Map<string, string>()

        for (const log of (logs ?? []) as any[]) {
          const msg = String(log.mensagem ?? '').toLowerCase()
          if (!autorizacaoMap.has(log.ticket_id) &&
              (msg.includes('autorizado') && !msg.includes('aguardando'))) {
            autorizacaoMap.set(log.ticket_id, log.created_at)
          }
          if (!logisticaMap.has(log.ticket_id) &&
              (msg.includes('logistica_reversa_concluida') || msg.includes('logistica reversa'))) {
            logisticaMap.set(log.ticket_id, log.created_at)
          }
        }

        // Calcula MTTRs
        const metrics: TicketMetric[] = (tickets as any[]).map((t: any) => {
          const createdAt = new Date(t.created_at).getTime()

          let mttrAutorizacao: number | null = null
          if (autorizacaoMap.has(t.id)) {
            const autAt = new Date(autorizacaoMap.get(t.id)!).getTime()
            mttrAutorizacao = Math.round((autAt - createdAt) / (1000 * 60 * 60) * 10) / 10
          }

          let mttrLogistica: number | null = null
          if (logisticaMap.has(t.id)) {
            const logAt = new Date(logisticaMap.get(t.id)!).getTime()
            mttrLogistica = Math.round((logAt - createdAt) / (1000 * 60 * 60) * 10) / 10
          }

          return {
            ticket_id: t.id,
            ticket_number: t.ticket_number,
            order_id: t.order_id,
            company_name: t.company_name,
            merchant_name: t.merchant_name,
            tipo: t.tipo,
            created_at: t.created_at,
            status: t.status,
            mttr_autorizacao_horas: mttrAutorizacao,
            mttr_logistica_horas: mttrLogistica,
          }
        })

        // Médias
        const autValidos = metrics.filter(m => m.mttr_autorizacao_horas !== null)
        const logValidos = metrics.filter(m => m.mttr_logistica_horas !== null)

        const mediaAut = autValidos.length > 0
          ? autValidos.reduce((s, m) => s + m.mttr_autorizacao_horas!, 0) / autValidos.length
          : null
        const mediaLog = logValidos.length > 0
          ? logValidos.reduce((s, m) => s + m.mttr_logistica_horas!, 0) / logValidos.length
          : null

        setSummary({
          total_tickets: tickets.length,
          abertos: (tickets as any[]).filter((t: any) => !['encerrado', 'recusado'].includes(t.status)).length,
          encerrados: (tickets as any[]).filter((t: any) => t.status === 'encerrado').length,
          mttr_autorizacao_media_horas: mediaAut ? Math.round(mediaAut * 10) / 10 : null,
          mttr_autorizacao_media_dias: mediaAut ? Math.round(mediaAut / 24 * 10) / 10 : null,
          mttr_logistica_media_horas: mediaLog ? Math.round(mediaLog * 10) / 10 : null,
          mttr_logistica_media_dias: mediaLog ? Math.round(mediaLog / 24 * 10) / 10 : null,
          tickets: metrics,
        })
      } catch (e) {
        console.error('Erro ao carregar metricas:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dateFrom, dateTo])

  return { summary, loading }
}
