import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, RefreshCw, Car, Package, FileText, MessageSquare } from 'lucide-react'
import { useTicket, addLog, updateTicketStatus } from '@/hooks/useTickets'
import { MeiBadge } from '@/components/MeiBadge'
import { formatarMoeda, formatarCNPJ, formatarChaveXML, gerarMensagem, templatePadrao } from '@/lib/formatters'
import { formatarDataHora } from '@/lib/dateUtils'
import type { TicketStatus, LogTipo } from '@/types'
import { STATUS_LABELS, KANBAN_COLUMNS } from '@/types'
import { useAuth } from '@/hooks/useAuth'

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { ticket, items, logs, loading, refetch } = useTicket(id ?? '')

  const [logText, setLogText] = useState('')
  const [logTipo, setLogTipo] = useState<LogTipo>('whatsapp')
  const [savingLog, setSavingLog] = useState(false)
  const [showMsgModal, setShowMsgModal] = useState(false)
  const [msgChannel, setMsgChannel] = useState<'whatsapp' | 'email'>('whatsapp')

  async function handleAddLog() {
    if (!logText.trim() || !id) return
    setSavingLog(true)
    await addLog(id, logTipo, logText.trim(), user?.id)
    setLogText('')
    setSavingLog(false)
    refetch()
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (!id) return
    await updateTicketStatus(id, newStatus, user?.id)
    refetch()
  }

  function buildMsgVars() {
    if (!ticket) return {}
    const itensTxt = items.map(i =>
      `  - ${i.item_name} (SKU: ${i.item_sku}) · Qtd: ${i.qtd_devolvida} · ${formatarMoeda(i.valor_devolvido)}`
    ).join('\n')
    return {
      order_id: ticket.order_id,
      cliente_nome: ticket.company_name ?? '',
      cnpj_cliente: formatarCNPJ(ticket.company_cnpj ?? ''),
      order_vehicle: ticket.order_vehicle ?? '',
      data_solicitacao: new Date(ticket.data_solicitacao).toLocaleDateString('pt-BR'),
      seller_nome: ticket.merchant_name ?? '',
      seller_loja_id: ticket.merchant_reference ?? '',
      itens_devolvidos: itensTxt,
      numero_nf: ticket.numero_nf ?? 'Não informado',
      chave_xml_nf: ticket.chave_xml_nf
        ? formatarChaveXML(ticket.chave_xml_nf)
        : '[Chave XML não informada]',
      valor_total_devolucao: formatarMoeda(ticket.valor_total_devolucao),
      motivo: ticket.motivo,
      is_mei: ticket.mei_status === 'mei' ? 'Sim' : ticket.mei_status === 'nao_mei' ? 'Não' : 'Não verificado',
    }
  }

  function handleSendWhatsApp() {
    // Aqui usaria o template do seller — por ora usa o padrão
    const msg = gerarMensagem(templatePadrao(), buildMsgVars())
    const tel = '' // TODO: buscar do seller playbook
    const url = tel
      ? `https://wa.me/55${tel.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    if (id) addLog(id, 'whatsapp', 'Comunicação gerada — canal WhatsApp', user?.id).then(refetch)
    setShowMsgModal(false)
  }

  function handleSendEmail() {
    const msg = gerarMensagem(templatePadrao(), buildMsgVars())
    const subject = encodeURIComponent(`Solicitação de Devolução - Pedido ${ticket?.order_id}`)
    const body = encodeURIComponent(msg)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    if (id) addLog(id, 'email', 'Comunicação gerada — canal E-mail', user?.id).then(refetch)
    setShowMsgModal(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <RefreshCw size={28} className="animate-spin text-zf-blue" />
    </div>
  )

  if (!ticket) return (
    <div className="card p-12 text-center text-gray-400">
      <p>Ticket não encontrado</p>
      <button onClick={() => navigate('/kanban')} className="btn-secondary mt-4 text-sm">
        Voltar ao Kanban
      </button>
    </div>
  )

  const nextStatuses = KANBAN_COLUMNS.filter(s => s !== ticket.status && s !== 'encerrado' && s !== 'recusado')
  const canShowNfd = ticket.mei_status === 'nao_mei'

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/kanban')} className="btn-ghost text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Kanban
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          Ticket #{ticket.ticket_number} · Pedido {ticket.order_id}
        </h1>
        <span className={`badge ${ticket.tipo === 'garantia' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
          {ticket.tipo === 'garantia' ? 'Garantia' : 'Devolução'}
        </span>
        <span className="badge bg-gray-100 text-gray-600">{STATUS_LABELS[ticket.status]}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-4">

          {/* Dados do pedido */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Package size={16} /> Dados do Pedido
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Empresa</p>
                <p className="font-medium">{ticket.company_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">CNPJ</p>
                <p className="font-medium">{formatarCNPJ(ticket.company_cnpj ?? '')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Seller</p>
                <p className="font-medium">{ticket.merchant_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Loja nº</p>
                <p className="font-medium">{ticket.merchant_reference || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Motivo</p>
                <p className="font-medium">{ticket.motivo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Valor da devolução</p>
                <p className="font-bold text-gray-900">{formatarMoeda(ticket.valor_total_devolucao)}</p>
              </div>
            </div>

            {ticket.order_vehicle && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <Car size={14} className="text-gray-400" />
                <span>{ticket.order_vehicle}</span>
              </div>
            )}

            {ticket.numero_nf && (
              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-gray-400" />
                <span className="text-gray-600">NF:</span>
                <span className="font-mono font-medium">{ticket.numero_nf}</span>
                {ticket.chave_xml_nf && (
                  <span className="text-xs text-gray-400 font-mono">
                    · {formatarChaveXML(ticket.chave_xml_nf).slice(0, 20)}...
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <MeiBadge status={ticket.mei_status ?? 'nao_verificado'} />
              {ticket.devolucao_tipo === 'parcial' && (
                <span className="badge bg-amber-100 text-amber-700">Devolução parcial</span>
              )}
            </div>
          </div>

          {/* Itens */}
          {items.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
                Itens ({items.length})
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Item</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Qtd</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item => (
                    <tr key={item.item_sku}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">{item.item_name}</p>
                        <p className="text-xs text-gray-400">SKU: {item.item_sku}{item.item_brand ? ` · ${item.item_brand}` : ''}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {item.qtd_devolvida}/{item.qtd_original}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {formatarMoeda(item.valor_devolvido)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Log */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare size={16} /> Histórico
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma atualização registrada ainda.</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="shrink-0 mt-0.5">
                      <span className={`badge text-xs ${
                        log.tipo === 'sistema' ? 'bg-gray-100 text-gray-500' :
                        log.tipo === 'whatsapp' ? 'bg-green-100 text-green-700' :
                        log.tipo === 'email' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{log.tipo}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800">{log.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatarDataHora(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Nova entrada */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex gap-2">
                <select value={logTipo} onChange={e => setLogTipo(e.target.value as LogTipo)}
                  className="input w-36 text-sm">
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="ligacao">Ligação</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <textarea
                value={logText}
                onChange={e => setLogText(e.target.value)}
                placeholder="Registrar atualização..."
                className="input resize-none text-sm"
                rows={2}
              />
              <button
                onClick={handleAddLog}
                disabled={!logText.trim() || savingLog}
                className="btn-primary text-sm"
              >
                {savingLog ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Ações de comunicação */}
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Comunicar com Seller</h3>
            <button
              onClick={() => { setMsgChannel('whatsapp'); setShowMsgModal(true) }}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2"
            >
              <Send size={14} /> Enviar WhatsApp
            </button>
            <button
              onClick={() => { setMsgChannel('email'); setShowMsgModal(true) }}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2"
            >
              <Send size={14} /> Enviar E-mail
            </button>
          </div>

          {/* Alterar status */}
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Alterar Status</h3>
            <div className="space-y-1.5">
              {KANBAN_COLUMNS
                .filter(s => s !== ticket.status)
                .filter(s => s !== 'nfd_pendente' || canShowNfd)
                .map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    → {STATUS_LABELS[s]}
                  </button>
                ))
              }
            </div>
          </div>

          {/* Info */}
          <div className="card p-4 space-y-2 text-xs text-gray-500">
            <p>Aberto em: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
            <p>Solicitação: {new Date(ticket.data_solicitacao).toLocaleDateString('pt-BR')}</p>
            <p>Canal: {ticket.canal_entrada?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {/* Modal pré-visualização da mensagem */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg space-y-4 p-6">
            <h3 className="font-bold text-gray-900">Pré-visualização da mensagem</h3>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64 font-sans">
              {gerarMensagem(templatePadrao(), buildMsgVars())}
            </pre>
            <div className="flex gap-3">
              <button onClick={() => setShowMsgModal(false)} className="btn-secondary flex-1 text-sm">
                Cancelar
              </button>
              <button
                onClick={msgChannel === 'whatsapp' ? handleSendWhatsApp : handleSendEmail}
                className="btn-primary flex-1 text-sm"
              >
                {msgChannel === 'whatsapp' ? '📱 Abrir WhatsApp' : '📧 Abrir E-mail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
