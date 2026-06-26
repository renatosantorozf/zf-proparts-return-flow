import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { SlaConfig, SlaInfo, TicketStatus } from '@/types'
import { calcularDiasUteis } from '@/lib/dateUtils'

export function useSla() {
  const [slaConfig, setSlaConfig] = useState<Record<string, number>>({})

  useEffect(() => {
    supabase.from('sla_config').select('*').then(({ data }) => {
      if (data) {
        const map: Record<string, number> = {}
        data.forEach((s: SlaConfig) => { map[s.status] = s.dias_uteis_max })
        setSlaConfig(map)
      }
    })
  }, [])

  function getSlaInfo(status: TicketStatus, createdAt: string): SlaInfo {
    const maxDias = slaConfig[status] ?? 3
    const diasUteis = calcularDiasUteis(new Date(createdAt), new Date())
    const percentual = Math.min((diasUteis / maxDias) * 100, 100)
    const slaStatus = percentual >= 100 ? 'critical' : percentual >= 70 ? 'warning' : 'ok'
    return { dias_uteis: diasUteis, percentual, status: slaStatus }
  }

  return { slaConfig, getSlaInfo }
}
