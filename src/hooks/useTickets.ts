import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { db } from '@/lib/db'
import type { Ticket, TicketItem, TicketLog, TicketStatus } from '@/types'

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await db
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTickets((data ?? []) as Ticket[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return { tickets, loading, error, refetch: load }
}

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [items, setItems] = useState<TicketItem[]>([])
  const [logs, setLogs] = useState<TicketLog[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [tRes, iRes, lRes] = await Promise.all([
      db.from('tickets').select('*').eq('id', id).single(),
      db.from('ticket_items').select('*').eq('ticket_id', id),
      db.from('ticket_logs').select('*').eq('ticket_id', id).order('created_at'),
    ])
    setTicket((tRes.data ?? null) as Ticket | null)
    setItems((iRes.data ?? []) as TicketItem[])
    setLogs((lRes.data ?? []) as TicketLog[])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  return { ticket, items, logs, loading, refetch: load }
}

export async function createTicket(
  ticketData: Record<string, unknown>,
  items: Record<string, unknown>[]
): Promise<{ id: string } | null> {
  const { data, error } = await db
    .from('tickets')
    .insert(ticketData)
    .select('id')
    .single()

  if (error || !data) {
    console.error('Erro ao criar ticket:', error)
    return null
  }

  const ticketId = (data as { id: string }).id

  if (items.length > 0) {
    await db.from('ticket_items').insert(
      items.map(i => ({ ...i, ticket_id: ticketId }))
    )
  }

  await addLog(ticketId, 'sistema', 'Ticket criado')
  return { id: ticketId }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus,
  userId?: string
): Promise<boolean> {
  const { error } = await db
    .from('tickets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', ticketId)

  if (error) return false
  await addLog(ticketId, 'sistema', `Status alterado para: ${newStatus}`, userId)
  return true
}

export async function addLog(
  ticketId: string,
  tipo: string,
  mensagem: string,
  userId?: string
): Promise<void> {
  await db.from('ticket_logs').insert({
    ticket_id: ticketId,
    tipo,
    mensagem,
    created_by: userId ?? null,
  })
}
