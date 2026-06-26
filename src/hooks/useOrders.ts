import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { OrderPreview, OrderRow } from '@/types'

interface UseOrdersParams {
  search?: string
  seller?: string
  period?: string
  page?: number
  pageSize?: number
}

interface UseOrdersResult {
  orders: OrderPreview[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
}

function groupRows(rows: OrderRow[]): OrderPreview[] {
  const map = new Map<string, OrderPreview>()
  for (const row of rows) {
    const id = row.id_sales_order
    if (!map.has(id)) {
      map.set(id, {
        id_sales_order: id,
        company_name: row.company_name ?? '',
        company_cnpj: row.company_cnpj ?? '',
        customer_email: row.customer_email ?? '',
        order_city: row.order_city ?? '',
        order_state: row.order_state ?? '',
        order_vehicle: row.order_vehicle ?? '',
        order_created_at: row.order_created_at ?? '',
        order_paid_date: row.order_paid_date ?? '',
        numero_nf: row.item_nota_fiscal ?? '',
        chave_xml_nf: row.item_chave_xml_nf ?? '',
        sellers: [],
      })
    }
    const preview = map.get(id)!
    const sellerRef = row.merchant_reference ?? ''
    let sellerGroup = preview.sellers.find(s => s.merchant_reference === sellerRef)
    if (!sellerGroup) {
      sellerGroup = { merchant_reference: sellerRef, merchant_name: row.merchant_name ?? '', items: [] }
      preview.sellers.push(sellerGroup)
    }
    sellerGroup.items.push(row)
  }
  return Array.from(map.values())
}

export function useOrders({
  search = '', seller = '', period = '', page = 1, pageSize = 20,
}: UseOrdersParams = {}): UseOrdersResult {
  const [orders, setOrders] = useState<OrderPreview[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let q = db.from('orders').select('id_sales_order', { count: 'exact' })

        if (search) q = q.ilike('id_sales_order', `%${search}%`)
        if (seller) q = q.eq('merchant_name', seller)
        if (period) {
          const days = parseInt(period)
          const since = new Date(Date.now() - days * 86400000).toISOString()
          q = q.gte('order_created_at', since)
        }

        const offset = (page - 1) * pageSize
        const { data: idRows, count, error: idErr } = await q
          .order('order_created_at', { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (idErr) throw new Error(idErr.message)
        if (cancelled) return

        const ids: string[] = [...new Set(
          ((idRows ?? []) as { id_sales_order: string }[]).map(r => r.id_sales_order)
        )]
        setTotal(count ?? 0)

        if (ids.length === 0) { setOrders([]); setLoading(false); return }

        const { data: rows, error: rowErr } = await db
          .from('orders')
          .select('*')
          .in('id_sales_order', ids)

        if (rowErr) throw new Error(rowErr.message)
        if (cancelled) return

        setOrders(groupRows((rows ?? []) as OrderRow[]))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar pedidos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [search, seller, period, page, pageSize, tick])

  return { orders, total, loading, error, refetch }
}

export async function getOrderPreview(orderId: string): Promise<OrderPreview | null> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('id_sales_order', orderId)

  if (error || !data || (data as unknown[]).length === 0) return null
  const previews = groupRows(data as OrderRow[])
  return previews[0] ?? null
}
