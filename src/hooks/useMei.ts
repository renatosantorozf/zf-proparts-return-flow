import { useState, useEffect } from 'react'
import type { MeiStatus } from '@/types'

interface MeiResult {
  status: MeiStatus
  loading: boolean
}

const cache = new Map<string, MeiStatus>()

export function useMei(cnpj: string): MeiResult {
  const clean = cnpj.replace(/\D/g, '')
  const [status, setStatus] = useState<MeiStatus>('nao_verificado')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!clean || clean.length !== 14) {
      setStatus('nao_verificado')
      return
    }
    if (cache.has(clean)) {
      setStatus(cache.get(clean)!)
      return
    }
    let cancelled = false
    setLoading(true)
    fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
      .then(r => r.json())
      .then((data: any) => {
        if (cancelled) return
        let s: MeiStatus = 'nao_mei'
        if (!data || data.status === 'ERROR') {
          s = 'nao_encontrado'
        } else if (data.descricao_identificador_matriz_filial === undefined &&
                   data.natureza_juridica?.includes('Empresário Individual')) {
          s = 'mei'
        } else if (data.porte === 'MICRO EMPRESA' &&
                   (data.natureza_juridica?.includes('Empresário Individual') ||
                    data.natureza_juridica?.includes('MEI'))) {
          s = 'mei'
        } else if (data.natureza_juridica?.includes('Pessoa Física')) {
          s = 'pessoa_fisica'
        }
        cache.set(clean, s)
        setStatus(s)
      })
      .catch(() => {
        if (!cancelled) setStatus('nao_verificado')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [clean])

  return { status, loading }
}

export function getMeiBadge(status: MeiStatus) {
  const map = {
    mei:           { label: 'MEI — NFD não obrigatória',      color: 'bg-green-100 text-green-800'  },
    nao_mei:       { label: 'Não-MEI — NFD obrigatória',      color: 'bg-yellow-100 text-yellow-800'},
    nao_encontrado:{ label: 'CNPJ não encontrado',             color: 'bg-gray-100 text-gray-600'   },
    pessoa_fisica: { label: 'Pessoa Física — NFD não aplicável',color: 'bg-blue-100 text-blue-800'  },
    nao_verificado:{ label: 'MEI não verificado',              color: 'bg-gray-100 text-gray-500'   },
  }
  return map[status] ?? map.nao_verificado
}
