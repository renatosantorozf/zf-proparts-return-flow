import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/db'
import type { OrderPreview, OrderRow } from '@/types'
import { formatarVeiculo, extrairNumeroNF } from '@/lib/formatters'

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
  const orderMap = new Map<string, OrderPreview>()

  for (const row of rows) {
    const id = row.id_sales_order
    if (!orderMap.has(id)) {
      const veiculoFormatado = formatarVeiculo(row.order_vehicle ?? '')
      const nfRaw = row.item_nota_fiscal ?? ''
      const { numero: numeroNF, chave: chaveNF } = extrairNumeroNF(nfRaw)
      orderMap.set(id, {
        id_sales_order: id,
        company_name: row.company_name ?? '',
        company_cnpj: row.company_cnpj ?? '',
        customer_email: row.customer_email ?? '',
        order_city: row.order_city ?? '',
        order_state: row.order_state ?? '',
        order_vehicle: veiculoFormatado,
        order_created_at: row.order_created_at ?? '',
        order_paid_date: row.order_paid_date ?? '',
        numero_nf: numeroNF,
        chave_xml_nf: chaveNF || (row.item_chave_xml_nf ?? ''),
        sellers: [],
      })
    }
    const preview = orderMap.get(id)!
    const sellerRef = row.merchant_reference ?? ''
    let sg = preview.sellers.find(s => s.merchant_reference === sellerRef)
    if (!sg) {
      sg = { merchant_reference: sellerRef, merchant_name: row.merchant_name ?? '', items: [] }
      preview.sellers.push(sg)
    }

    // Consolida linhas do mesmo SKU no mesmo seller
    // Soma quantidades e agrupa estados
    const existingItem = sg.items.find((i: OrderRow) => i.item_sku === row.item_sku)
    if (existingItem) {
      // Soma a quantidade
      existingItem.item_quantity = (existingItem.item_quantity ?? 0) + (row.item_quantity ?? 0)
      // Agrega estados únicos
      const existingStates = String(existingItem.item_state ?? '').split(',').map(s => s.trim())
      const newState = String(row.item_state ?? '').trim()
      if (newState && !existingStates.includes(newState)) {
        existingItem.item_state = [...existingStates, newState].filter(Boolean).join(', ')
      }
    } else {
      sg.items.push({ ...row })
    }
  }

  return Array.from(orderMap.values())
}

function detectSearchType(q: string): 'order_id' | 'cnpj' | 'company' {
  const clean = q.replace(/\D/g, '')
  if (/^\d+$/.test(q.trim()) && q.trim().length >= 4) return 'order_id'
  if (clean.length === 14) return 'cnpj'
  return 'company'
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

        if (search.trim()) {
          const type = detectSearchType(search.trim())
          if (type === 'order_id') {
            q = q.ilike('id_sales_order', `%${search.trim()}%`)
          } else if (type === 'cnpj') {
            q = q.eq('company_cnpj', search.replace(/\D/g, ''))
          } else {
            q = q.ilike('company_name', `%${search.trim()}%`)
          }
        }

        if (seller) q = q.eq('merchant_name', seller)
        if (period) {
          const days = parseInt(period)
          const since = new Date(Date.now() - days * 86400000).toISOString()
          q = q.gte('order_created_at', since)
        }

        const offset = (page - 1) * pageSize
        const { data: idRows, count, error: idErr } = await q
          .order('order_created_at', { ascending: false })
          .range(offset, offset + pageSize * 5 - 1)

        if (idErr) throw new Error(idErr.message)
        if (cancelled) return

        const seen = new Set<string>()
        const ids: string[] = []
        for (const r of (idRows ?? []) as { id_sales_order: string }[]) {
          if (!seen.has(r.id_sales_order)) {
            seen.add(r.id_sales_order)
            ids.push(r.id_sales_order)
            if (ids.length >= pageSize) break
          }
        }

        setTotal(count ?? 0)
        if (ids.length === 0) { setOrders([]); setLoading(false); return }

        const { data: rows, error: rowErr } = await db
          .from('orders').select('*').in('id_sales_order', ids)

        if (rowErr) throw new Error(rowErr.message)
        if (cancelled) return

        const grouped = groupRows((rows ?? []) as OrderRow[])
        const ordered = ids
          .map(id => grouped.find(o => o.id_sales_order === id))
          .filter(Boolean) as OrderPreview[]
        setOrders(ordered)
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
  const { data, error } = await db.from('orders').select('*').eq('id_sales_order', orderId)
  if (error || !data || (data as unknown[]).length === 0) return null
  return groupRows(data as OrderRow[])[0] ?? null
}

export async function searchOrders(query: string): Promise<OrderPreview[]> {
  if (!query.trim()) return []
  const type = detectSearchType(query.trim())
  let q = db.from('orders').select('*')

  if (type === 'order_id') {
    q = q.ilike('id_sales_order', `%${query.trim()}%`)
  } else if (type === 'cnpj') {
    q = q.eq('company_cnpj', query.replace(/\D/g, ''))
  } else {
    q = q.ilike('company_name', `%${query.trim()}%`)
  }

  const { data } = await q.order('order_created_at', { ascending: false }).limit(200)
  if (!data || (data as unknown[]).length === 0) return []
  return groupRows(data as OrderRow[])
}
