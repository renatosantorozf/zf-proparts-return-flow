import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { createTicket } from '@/hooks/useTickets'
import { useMei } from '@/hooks/useMei'
import type { OrderPreview, TicketItem, TicketTipo, TicketSubtipo, CanalEntrada } from '@/types'

interface CreateTicketFormProps {
  order: OrderPreview
  selectedItems: Omit<TicketItem, 'id' | 'ticket_id'>[]
  devolucaoTipo: 'total' | 'parcial'
  valorTotal: number
  onBack: () => void
}

export function CreateTicketForm({
  order, selectedItems, devolucaoTipo, valorTotal, onBack
}: CreateTicketFormProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { status: meiStatus } = useMei(order.company_cnpj)

  const [tipo, setTipo] = useState<TicketTipo>('devolucao')
  const [subtipo, setSubtipo] = useState<TicketSubtipo | ''>('')
  const [motivo, setMotivo] = useState('')
  const [canal, setCanal] = useState<CanalEntrada>('whatsapp_individual')
  const [chaveXml, setChaveXml] = useState(order.chave_xml_nf ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Seller principal (primeiro da lista)
  const sellerPrincipal = order.sellers[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) { setError('Informe o motivo da devolução'); return }
    setLoading(true)
    setError('')

    const result = await createTicket({
      order_id: order.id_sales_order,
      tipo,
      subtipo: tipo === 'garantia' && subtipo ? subtipo as TicketSubtipo : undefined,
      status: 'aberto',
      canal_entrada: canal,
      motivo: motivo.trim(),
      company_name: order.company_name,
      company_cnpj: order.company_cnpj,
      customer_email: order.customer_email,
      order_city: order.order_city,
      order_state: order.order_state,
      order_vehicle: order.order_vehicle,
      merchant_reference: sellerPrincipal?.merchant_reference,
      merchant_name: sellerPrincipal?.merchant_name,
      numero_nf: order.numero_nf,
      chave_xml_nf: chaveXml || undefined,
      mei_status: meiStatus,
      devolucao_tipo: devolucaoTipo,
      valor_total_devolucao: valorTotal,
      created_by: user?.id,
      data_solicitacao: new Date().toISOString().split('T')[0],
      order_created_at: order.order_created_at,
    }, selectedItems)

    setLoading(false)
    if (!result) { setError('Erro ao criar ticket. Tente novamente.'); return }
    navigate(`/tickets/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-4 bg-gray-50 space-y-1">
        <p className="text-xs text-gray-500">Criando ticket para</p>
        <p className="font-bold text-gray-900">#{order.id_sales_order} · {order.company_name}</p>
        <p className="text-sm text-gray-600">
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'} ·{' '}
          {devolucaoTipo === 'total' ? 'Devolução total' : 'Devolução parcial'} ·{' '}
          R$ {(valorTotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Tipo *</label>
        <div className="flex gap-3">
          {(['devolucao', 'garantia'] as TicketTipo[]).map(t => (
            <label key={t} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${tipo === t ? 'border-zf-blue bg-zf-blue-light text-zf-blue' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t}
                onChange={() => setTipo(t)} className="sr-only" />
              {t === 'devolucao' ? 'Devolução' : 'Garantia'}
            </label>
          ))}
        </div>
      </div>

      {/* Subtipo (apenas garantia) */}
      {tipo === 'garantia' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de garantia</label>
          <select value={subtipo} onChange={e => setSubtipo(e.target.value as TicketSubtipo)}
            className="input">
            <option value="">Selecione...</option>
            <option value="proxima_entrega">Próxima à entrega</option>
            <option value="pos_entrega">Pós-entrega ao cliente final</option>
            <option value="envio_fabrica">Envio à fábrica para avaliação</option>
          </select>
        </div>
      )}

      {/* Canal de entrada */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Canal de entrada *</label>
        <select value={canal} onChange={e => setCanal(e.target.value as CanalEntrada)}
          className="input">
          <option value="whatsapp_individual">WhatsApp Individual</option>
          <option value="whatsapp_grupo">WhatsApp Grupo</option>
          <option value="email">E-mail</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da devolução *</label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          className="input resize-none"
          rows={3}
          placeholder="Descreva o motivo da devolução ou garantia..."
          autoFocus
        />
      </div>

      {/* Chave XML (se não veio automático) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chave XML da NF-e
          <span className="text-gray-400 font-normal ml-1">(opcional — PAD-01)</span>
        </label>
        <input
          type="text"
          value={chaveXml}
          onChange={e => setChaveXml(e.target.value.replace(/\D/g, ''))}
          className="input font-mono text-sm"
          placeholder="44 dígitos da chave de acesso"
          maxLength={44}
        />
        {chaveXml && chaveXml.length !== 44 && (
          <p className="text-xs text-amber-600 mt-1">Chave deve ter exatamente 44 dígitos ({chaveXml.length}/44)</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          ← Voltar
        </button>
        <button type="submit" disabled={loading || !motivo.trim()} className="btn-primary flex-1">
          {loading ? 'Criando...' : 'Criar Ticket'}
        </button>
      </div>
    </form>
  )
}
