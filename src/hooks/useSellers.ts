import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { Seller } from '@/types'

export function useSellers() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await db.from('sellers').select('*').order('merchant_name')
    setSellers((data ?? []) as Seller[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Sellers sem playbook completo (sem contato E sem instruções)
  const semPlaybook = sellers.filter(s => !s.instrucoes && !s.contato_whatsapp && !s.contato_email)

  return { sellers, loading, semPlaybook, refetch: load }
}

// Busca seller pelo merchant_reference do pedido
export async function getSellerByRef(merchantReference: string): Promise<Seller | null> {
  const { data } = await db
    .from('sellers')
    .select('*')
    .eq('merchant_reference', merchantReference)
    .single()
  return (data as Seller | null) ?? null
}
