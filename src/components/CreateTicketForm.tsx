import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { createTicket } from '@/hooks/useTickets'
import { useMei } from '@/hooks/useMei'
import { getSellerByRef } from '@/hooks/useSellers'
import type { OrderPreview, TicketItem, TicketTipo, TicketSubtipo, CanalEntrada } from '@/types'

interface CreateTicketFormProps {
  order: OrderPreview
  selectedItems: Omit<TicketItem, 'id' | 'ticket_id'>[]
  devolucaoTipo: 'total' | 'parcial'
  valorTotal: number
  onBack: () => void
}

// Mapeia canal do playbook para canal de entrada do ticket
function canalPlaybookParaEntrada(canal: string | null | undefined): CanalEntrada {
  if (canal === 'whatsapp' || canal === 'ambos') return 'whatsapp_individual'
  if (canal === 'email') return 'email'
  return 'whatsapp_individual'
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
  const [sellerNome, setSellerNome] = useState<string>('')
  const [canalPreenchido, setCanalPreenchido] = useState(false)

  const sellerPrincipal = order.sellers[0]

  // Pré-seleciona canal do playbook do seller
  useEffect(() => {
    if (!sellerPrincipal?.merchant_reference) return
    getSellerByRef(sellerPrincipal.merchant_reference).then(s => {
      if (s) {
        setSellerNome(s.merchant_name)
        const canalSugerido = canalPlaybookParaEntrada(s.canal_preferencial)
        setCanal(canalSugerido)
        setCanalPreenchido(true)
      }
    })
  }, [sellerPrincipal?.merchant_reference])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) { setError('Informe o motivo da devolução'); return }
    setLoading(true)
    setError('')

    const ticketData: Record<string, unknown> = {
      order_id: order.id_sales_order,
      tipo,
      subtipo: tipo === 'garantia' && subtipo ? subtipo : null,
      status: 'aberto',
      canal_entrada: canal,
      motivo: motivo.trim(),
      company_name: order.company_name,
      company_cnpj: order.company_cnpj,
      customer_email: order.customer_email,
      order_city: order.order_city,
      order_state: order.order_state,
      order_vehicle: order.order_vehicle,
      merchant_reference: sellerPrincipal?.merchant_reference ?? null,
      merchant_name: sellerPrincipal?.merchant_name ?? null,
      numero_nf: order.numero_nf || null,
      chave_xml_nf: chaveXml || null,
      mei_status: meiStatus,
      devolucao_tipo: devolucaoTipo,
      valor_total_devolucao: valorTotal,
      created_by: user?.id ?? null,
      data_solicitacao: new Date().toISOString().split('T')[0],
      order_created_at: order.order_created_at || null,
    }

    const items = selectedItems.map(i => ({
      item_sku: i.item_sku,
      item_brand: i.item_brand ?? null,
      item_part_number: i.item_part_number ?? null,
      item_name: i.item_name ?? null,
      item_net_price: i.item_net_price ?? null,
      qtd_original: i.qtd_original,
      qtd_devolvida: i.qtd_devolvida,
      valor_devolvido: i.valor_devolvido ?? null,
      merchant_reference: i.merchant_reference ?? null,
      merchant_name: i.merchant_name ?? null,
    }))

    const result = await createTicket(ticketData, items)
    setLoading(false)
    if (!result) { setError('Erro ao criar ticket. Tente novamente.'); return }
    navigate(`/tickets/${result.id}`)
  }

  const CANAIS: { value: CanalEntrada; label: string }[] = [
    { value: 'whatsapp_individual', label: 'WhatsApp Individual' },
    { value: 'whatsapp_grupo',      label: 'WhatsApp Grupo' },
    { value: 'email',               label: 'E-mail' },
    { value: 'outro',               label: 'Outro' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Resumo */}
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
            <label key={t} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              tipo === t ? 'border-zf-blue bg-zf-blue-light text-zf-blue' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t}
                onChange={() => setTipo(t)} className="sr-only" />
              {t === 'devolucao' ? 'Devolução' : 'Garantia'}
            </label>
          ))}
        </div>
      </div>

      {/* Subtipo garantia */}
      {tipo === 'garantia' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de garantia</label>
          <select value={subtipo} onChange={e => setSubtipo(e.target.value as TicketSubtipo)} className="input">
            <option value="">Selecione...</option>
            <option value="proxima_entrega">Próxima à entrega</option>
            <option value="pos_entrega">Pós-entrega ao cliente final</option>
            <option value="envio_fabrica">Envio à fábrica para avaliação</option>
          </select>
        </div>
      )}

      {/* Canal de entrada — pré-selecionado pelo playbook do seller */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Canal de entrada *
          {canalPreenchido && (
            <span className="ml-2 text-xs text-zf-blue font-normal">
              pré-selecionado pelo playbook de {sellerNome || sellerPrincipal?.merchant_name}
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CANAIS.map(({ value, label }) => (
            <label key={value} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
              canal === value
                ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}>
              <input type="radio" name="canal" value={value} checked={canal === value}
                onChange={() => setCanal(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Motivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da devolução *</label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
          className="input resize-none" rows={3}
          placeholder="Descreva o motivo..." autoFocus />
      </div>

      {/* Chave XML */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chave XML da NF-e <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input type="text" value={chaveXml}
          onChange={e => setChaveXml(e.target.value.replace(/\D/g, ''))}
          className="input font-mono text-sm" placeholder="44 dígitos" maxLength={44} />
        {chaveXml && chaveXml.length !== 44 && (
          <p className="text-xs text-amber-600 mt-1">{chaveXml.length}/44 dígitos</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">← Voltar</button>
        <button type="submit" disabled={loading || !motivo.trim()} className="btn-primary flex-1">
          {loading ? 'Criando...' : 'Criar Ticket'}
        </button>
      </div>
    </form>
  )
}
