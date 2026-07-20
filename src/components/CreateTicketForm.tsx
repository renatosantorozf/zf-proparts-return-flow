import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMei } from '@/hooks/useMei'
import { getSellerByRef } from '@/hooks/useSellers'
import type { OrderPreview, TicketItem, TicketTipo, TicketSubtipo, CanalEntrada } from '@/types'

export interface TicketDraft {
  tipo: TicketTipo
  subtipo: TicketSubtipo | ''
  canal: CanalEntrada
  motivo: string
  chaveXml: string
}

interface CreateTicketFormProps {
  order: OrderPreview
  selectedItems: Omit<TicketItem, 'id' | 'ticket_id'>[]
  devolucaoTipo: 'total' | 'parcial'
  onConfirm: (draft: TicketDraft) => void
  onBack: () => void
}

function canalPlaybookParaEntrada(canal: string | null | undefined): CanalEntrada {
  if (canal === 'whatsapp' || canal === 'ambos') return 'whatsapp_individual'
  if (canal === 'email') return 'email'
  return 'whatsapp_individual'
}

export function CreateTicketForm({
  order, selectedItems, devolucaoTipo, onConfirm, onBack
}: CreateTicketFormProps) {
  const { user: _user } = useAuth()
  const { status: meiStatus } = useMei(order.company_cnpj)

  const [tipo, setTipo] = useState<TicketTipo>('devolucao')
  const [subtipo, setSubtipo] = useState<TicketSubtipo | ''>('')
  const [motivo, setMotivo] = useState('')
  const [canal, setCanal] = useState<CanalEntrada>('whatsapp_individual')
  const [chaveXml, setChaveXml] = useState(order.chave_xml_nf ?? '')  // pré-preenchido da planilha
  const [error, setError] = useState('')
  const [sellerNome, setSellerNome] = useState<string>('')
  const [sellerPrazo, setSellerPrazo] = useState<number | null>(null)
  const [canalPreenchido, setCanalPreenchido] = useState(false)

  const sellerDoItem = selectedItems[0]
  const merchantReference = sellerDoItem?.merchant_reference ?? null
  const merchantName = sellerDoItem?.merchant_name ?? null

  useEffect(() => {
    if (!merchantReference) return
    getSellerByRef(merchantReference).then(s => {
      if (s) {
        setSellerNome(s.merchant_name)
        setCanal(canalPlaybookParaEntrada(s.canal_preferencial))
        setCanalPreenchido(true)
        setSellerPrazo((s as any).prazo_devolucao_dias ?? null)
      }
    })
  }, [merchantReference])

  // Calcular dias desde o pedido
  const diasDesdePedido = order.order_created_at
    ? Math.floor((Date.now() - new Date(order.order_created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const alertaPrazo = sellerPrazo !== null && diasDesdePedido !== null && diasDesdePedido > sellerPrazo
  const proximoPrazo = sellerPrazo !== null && diasDesdePedido !== null &&
    !alertaPrazo && diasDesdePedido >= sellerPrazo - 5

  // Suprimir warning de meiStatus nao usado diretamente
  void meiStatus

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo.trim()) { setError('Informe o motivo'); return }
    // Passa para revisao — NAO salva ainda
    onConfirm({ tipo, subtipo, canal, motivo: motivo.trim(), chaveXml })
  }

  const CANAIS: { value: CanalEntrada; label: string }[] = [
    { value: 'whatsapp_individual', label: 'WhatsApp Individual' },
    { value: 'whatsapp_grupo',      label: 'WhatsApp Grupo' },
    { value: 'email',               label: 'E-mail' },
    { value: 'outro',               label: 'Outro' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="card p-4 bg-gray-50 space-y-1">
        <p className="text-xs text-gray-500">Pedido #{order.id_sales_order} · {order.company_name}</p>
        <p className="text-sm font-medium text-gray-800">Seller: {merchantName || '—'}</p>
        <p className="text-sm text-gray-600">
          {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'itens'} ·{' '}
          {devolucaoTipo === 'total' ? 'Devolucao total' : 'Devolucao parcial'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Tipo *</label>
        <div className="flex gap-3">
          {(['devolucao', 'garantia'] as TicketTipo[]).map(t => (
            <label key={t} className={'flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ' +
              (tipo === t ? 'border-zf-blue bg-zf-blue-light text-zf-blue' : 'border-gray-200 hover:border-gray-300')}>
              <input type="radio" name="tipo" value={t} checked={tipo === t}
                onChange={() => setTipo(t)} className="sr-only" />
              {t === 'devolucao' ? 'Devolucao' : 'Garantia'}
            </label>
          ))}
        </div>
      </div>

      {tipo === 'garantia' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de garantia</label>
          <select value={subtipo} onChange={e => setSubtipo(e.target.value as TicketSubtipo)} className="input">
            <option value="">Selecione...</option>
            <option value="proxima_entrega">Proxima a entrega</option>
            <option value="pos_entrega">Pos-entrega ao cliente final</option>
            <option value="envio_fabrica">Envio a fabrica para avaliacao</option>
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Canal de entrada *
          {canalPreenchido && (
            <span className="ml-2 text-xs text-zf-blue font-normal">
              pre-selecionado pelo playbook de {sellerNome || merchantName}
            </span>
          )}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CANAIS.map(({ value, label }) => (
            <label key={value} className={'flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ' +
              (canal === value ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700')}>
              <input type="radio" name="canal" value={value} checked={canal === value}
                onChange={() => setCanal(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
          className="input resize-none" rows={3} placeholder="Descreva o motivo..." autoFocus />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Chave XML da NF-e <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input type="text" value={chaveXml}
          onChange={e => setChaveXml(e.target.value.replace(/\D/g, ''))}
          className="input font-mono text-sm" placeholder="44 digitos" maxLength={44} />
        {chaveXml && chaveXml.length !== 44 && (
          <p className="text-xs text-amber-600 mt-1">{chaveXml.length}/44 digitos</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">← Voltar</button>
        <button type="submit" disabled={!motivo.trim()} className="btn-primary flex-1">
          Revisar →
        </button>
      </div>
    </form>
  )
}
