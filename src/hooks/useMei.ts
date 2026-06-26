import { useState, useEffect } from 'react'
import type { MeiStatus } from '@/types'

interface MeiResult {
  status: MeiStatus
  loading: boolean
  rawData?: Record<string, unknown>
}

const cache = new Map<string, MeiStatus>()

// Lógica de identificação MEI baseada na BrasilAPI
// Campos relevantes:
//   natureza_juridica: "213-5" = Empresário Individual (MEI)
//   porte: "MICRO EMPRESA" ou null (MEI não tem porte)
//   opcao_pelo_mei: true/false (campo direto quando disponível)
function classifyMei(data: Record<string, unknown>): MeiStatus {
  if (!data) return 'nao_encontrado'
  if (data.status === 'ERROR' || data.message) return 'nao_encontrado'

  const natureza = String(data.natureza_juridica ?? '').toLowerCase()
  const porte = String(data.porte ?? '').toLowerCase()

  // Campo direto opcao_pelo_mei (mais confiável quando presente)
  if (data.opcao_pelo_mei === true) return 'mei'
  if (data.opcao_pelo_mei === false) {
    // Pode ser pessoa física mesmo assim
    if (natureza.includes('empresário individual') || natureza.includes('213')) {
      return 'nao_mei' // EI mas não MEI
    }
  }

  // Código 213-5 = Empresário Individual (categoria que inclui MEI)
  // MEI é subconjunto do EI com opção pelo Simples Nacional
  if (natureza.includes('213-5') || natureza.includes('empresário individual')) {
    // MEI tem porte MICRO EMPRESA ou null/vazio
    if (porte === 'micro empresa' || porte === '' || porte === 'null' || !data.porte) {
      return 'mei'
    }
    return 'nao_mei'
  }

  // Pessoa física (CPF como CNPJ)
  if (natureza.includes('pessoa física') || natureza.includes('cpf')) {
    return 'pessoa_fisica'
  }

  return 'nao_mei'
}

export function useMei(cnpj: string): MeiResult {
  const clean = (cnpj ?? '').replace(/\D/g, '')
  const [status, setStatus] = useState<MeiStatus>('nao_verificado')
  const [loading, setLoading] = useState(false)
  const [rawData, setRawData] = useState<Record<string, unknown>>()

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
      .then((data: Record<string, unknown>) => {
        if (cancelled) return
        setRawData(data)
        const s = classifyMei(data)
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

  return { status, loading, rawData }
}

export function getMeiBadge(status: MeiStatus) {
  const map: Record<MeiStatus, { label: string; color: string }> = {
    mei:            { label: 'MEI — NFD não obrigatória',       color: 'bg-green-100 text-green-800'  },
    nao_mei:        { label: 'Não-MEI — NFD obrigatória',       color: 'bg-yellow-100 text-yellow-800'},
    nao_encontrado: { label: 'CNPJ não encontrado',              color: 'bg-gray-100 text-gray-600'   },
    pessoa_fisica:  { label: 'Pessoa Física — NFD não aplicável',color: 'bg-blue-100 text-blue-800'  },
    nao_verificado: { label: 'MEI não verificado',               color: 'bg-gray-100 text-gray-500'   },
  }
  return map[status] ?? map.nao_verificado
}
