import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, RefreshCw, Car, Package, FileText, MessageSquare, Copy, Check } from 'lucide-react'
import { useTicket, addLog, updateTicketStatus } from '@/hooks/useTickets'
import { getSellerByRef } from '@/hooks/useSellers'
import { MeiBadge } from '@/components/MeiBadge'
import { formatarMoeda, formatarCNPJ, formatarChaveXML, gerarMensagem, templatePadrao } from '@/lib/formatters'
import { formatarDataHora } from '@/lib/dateUtils'
import type { TicketStatus, LogTipo, Seller } from '@/types'
import { STATUS_LABELS, KANBAN_COLUMNS } from '@/types'
import { useAuth } from '@/hooks/useAuth'

export default function TicketPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { ticket, items, logs, loading, refetch } = useTicket(id ?? '')
  const [seller, setSeller] = useState<Seller | null>(null)
  const [logText, setLogText] = useState('')
  const [logTipo, setLogTipo] = useState<LogTipo>('whatsapp')
  const [savingLog, setSavingLog] = useState(false)
  const [showMsgModal, setShowMsgModal] = useState(false)
  const [msgChannel, setMsgChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!ticket?.merchant_reference) return
    getSellerByRef(ticket.merchant_reference).then(s => setSeller(s))
  }, [ticket?.merchant_reference])

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
      contato_seller: seller?.contato_nome || seller?.merchant_name || ticket.merchant_name || 'Equipe de Devoluções',
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

  function getTemplate(): string {
    return seller?.template_mensagem || templatePadrao()
  }

  function getMsgPreview(): string {
    return gerarMensagem(getTemplate(), buildMsgVars())
  }

  function handleSendWhatsApp() {
    const msg = getMsgPreview()
    const tel = seller?.contato_whatsapp ? seller.contato_whatsapp.replace(/\D/g, '') : ''
    const url = tel
      ? `https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
    if (id) addLog(id, 'whatsapp', `Comunicação gerada via WhatsApp${tel ? ` para ${seller?.contato_nome || tel}` : ''}`, user?.id).then(refetch)
    setShowMsgModal(false)
  }

  function handleSendEmail() {
    const msg = getMsgPreview()
    const email = seller?.contato_email ?? ''
    const subject = `Solicitação de Devolução - Pedido ${ticket?.order_id}`

    // Copia para clipboard como fallback universal
    // mailto pode ter problemas de encoding no Outlook dependendo da configuração
    navigator.clipboard.writeText(msg).catch(() => {})

    // Abre mailto com window.open para forçar nova janela
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`
    window.open(mailto)

    if (id) addLog(id, 'email', `Comunicação gerada via E-mail${email ? ` para ${email}` : ''}`, user?.id).then(refetch)
    setShowMsgModal(false)
  }

  function handleCopyMsg() {
    navigator.clipboard.writeText(getMsgPreview())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <RefreshCw size={28} className="animate-spin text-zf-blue" />
    </div>
  )

  if (!ticket) return (
    <div className="card p-12 text-center text-gray-400">
      <p>Ticket não encontrado</p>
      <button onClick={() => navigate('/kanban')} className="btn-secondary mt-4 text-sm">Voltar ao Kanban</button>
    </div>
  )

  const canShowNfd = ticket.mei_status === 'nao_mei'
  const canalLabel = ticket.canal_entrada ? String(ticket.canal_entrada).replace(/_/g, ' ') : '—'

  return (
    <div className="max-w-4xl space-y-5">
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
        <span className="badge bg-gray-100 text-gray-600">{STATUS_LABELS[ticket.status as TicketStatus]}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">

          {/* Dados do pedido */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Package size={16} /> Dados do Pedido</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-400">Empresa</p><p className="font-medium">{ticket.company_name}</p></div>
              <div><p className="text-xs text-gray-400">CNPJ</p><p className="font-medium">{formatarCNPJ(ticket.company_cnpj ?? '')}</p></div>
              <div><p className="text-xs text-gray-400">Seller</p><p className="font-medium">{ticket.merchant_name}</p></div>
              <div><p className="text-xs text-gray-400">Loja nº</p><p className="font-medium">{ticket.merchant_reference || '—'}</p></div>
              <div><p className="text-xs text-gray-400">Motivo</p><p className="font-medium">{ticket.motivo}</p></div>
              <div><p className="text-xs text-gray-400">Valor da devolução</p><p className="font-bold text-gray-900">{formatarMoeda(ticket.valor_total_devolucao)}</p></div>
            </div>
            {ticket.order_vehicle && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <Car size={14} className="text-gray-400" /><span>{ticket.order_vehicle}</span>
              </div>
            )}
            {ticket.numero_nf && (
              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-gray-400" />
                <span className="text-gray-600">NF:</span>
                <span className="font-mono font-medium">{ticket.numero_nf}</span>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <MeiBadge status={ticket.mei_status ?? 'nao_verificado'} />
              {ticket.devolucao_tipo === 'parcial' && <span className="badge bg-amber-100 text-amber-700">Devolução parcial</span>}
            </div>
          </div>

          {/* Playbook do seller */}
          {seller && (seller.instrucoes || seller.url_formulario) && (
            <div className="card p-5 space-y-3 border-l-4 border-zf-blue">
              <h2 className="font-semibold text-gray-800 text-sm">📋 Processo — {seller.merchant_name}</h2>
              {seller.instrucoes && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{seller.instrucoes}</p>
                </div>
              )}
              {seller.regras_excecao && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">⚠️ Regras / Exceções</p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{seller.regras_excecao}</p>
                </div>
              )}
              {seller.url_formulario && (
                <a href={seller.url_formulario} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-purple-700 hover:underline">
                  🔗 Abrir formulário do seller
                </a>
              )}
            </div>
          )}
          {seller && !seller.instrucoes && !seller.contato_whatsapp && !seller.contato_email && (
            <div className="card p-4 border border-amber-200 bg-amber-50">
              <p className="text-sm text-amber-800">
                ⚠️ Playbook do seller não configurado —{' '}
                <a href="/playbook" className="underline font-medium">completar cadastro</a>
              </p>
            </div>
          )}

          {/* Itens */}
          {items.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Itens ({items.length})</div>
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
                      <td className="px-4 py-2.5 text-right text-gray-600">{item.qtd_devolvida}/{item.qtd_original}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{formatarMoeda(item.valor_devolvido)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Log */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2"><MessageSquare size={16} /> Histórico</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.length === 0 ? <p className="text-sm text-gray-400">Nenhuma atualização registrada.</p> : (
                logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <span className={`badge text-xs shrink-0 mt-0.5 ${
                      log.tipo === 'sistema' ? 'bg-gray-100 text-gray-500' :
                      log.tipo === 'whatsapp' ? 'bg-green-100 text-green-700' :
                      log.tipo === 'email' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{log.tipo}</span>
                    <div className="flex-1">
                      <p className="text-gray-800">{log.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatarDataHora(log.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <select value={logTipo} onChange={e => setLogTipo(e.target.value as LogTipo)} className="input w-36 text-sm">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="ligacao">Ligação</option>
                <option value="outro">Outro</option>
              </select>
              <textarea value={logText} onChange={e => setLogText(e.target.value)}
                placeholder="Registrar atualização..." className="input resize-none text-sm" rows={2} />
              <button onClick={handleAddLog} disabled={!logText.trim() || savingLog} className="btn-primary text-sm">
                {savingLog ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Comunicar com Seller</h3>
            {seller?.contato_nome && (
              <p className="text-xs text-gray-600 font-medium">{seller.contato_nome}</p>
            )}
            {seller?.contato_whatsapp && (
              <p className="text-xs text-gray-500">📱 {seller.contato_whatsapp}</p>
            )}
            {seller?.contato_email && (
              <p className="text-xs text-gray-500">✉️ {seller.contato_email}</p>
            )}
            {!seller?.contato_whatsapp && !seller?.contato_email && (
              <p className="text-xs text-amber-600">⚠️ Contatos não cadastrados —{' '}
                <a href="/playbook" className="underline">completar</a>
              </p>
            )}
            <button onClick={() => { setMsgChannel('whatsapp'); setShowMsgModal(true) }}
              className="btn-primary w-full text-sm flex items-center justify-center gap-2">
              <Send size={14} /> Enviar WhatsApp
            </button>
            <button onClick={() => { setMsgChannel('email'); setShowMsgModal(true) }}
              className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
              <Send size={14} /> Enviar E-mail
            </button>
          </div>

          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Alterar Status</h3>
            <div className="space-y-1.5">
              {KANBAN_COLUMNS
                .filter(s => s !== ticket.status)
                .filter(s => s !== 'nfd_pendente' || canShowNfd)
                .map(s => (
                  <button key={s} onClick={() => handleStatusChange(s)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                    → {STATUS_LABELS[s]}
                  </button>
                ))}
            </div>
          </div>

          <div className="card p-4 space-y-2 text-xs text-gray-500">
            <p>Aberto em: {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</p>
            <p>Solicitação: {new Date(ticket.data_solicitacao).toLocaleDateString('pt-BR')}</p>
            <p>Canal: {canalLabel}</p>
          </div>
        </div>
      </div>

      {/* Modal pré-visualização */}
      {showMsgModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg space-y-4 p-6">
            <div>
              <h3 className="font-bold text-gray-900">Pré-visualização da mensagem</h3>
              <p className="text-xs text-gray-500 mt-1">
                {msgChannel === 'email'
                  ? <>Para: <span className="font-medium">{seller?.contato_email || '(sem e-mail cadastrado)'}</span></>
                  : <>Para: <span className="font-medium">{seller?.contato_whatsapp || '(sem WhatsApp cadastrado)'}</span></>
                }
              </p>
            </div>
            <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-72 font-sans leading-relaxed">
              {getMsgPreview()}
            </pre>
            <div className="space-y-2">
              <div className="flex gap-3">
                <button onClick={() => setShowMsgModal(false)} className="btn-secondary flex-1 text-sm">Cancelar</button>
                <button
                  onClick={msgChannel === 'whatsapp' ? handleSendWhatsApp : handleSendEmail}
                  className="btn-primary flex-1 text-sm">
                  {msgChannel === 'whatsapp' ? '📱 Abrir WhatsApp' : '📧 Abrir E-mail'}
                </button>
              </div>
              {/* Fallback: copiar mensagem para clipboard */}
              <button onClick={handleCopyMsg}
                className="w-full btn-ghost text-xs flex items-center justify-center gap-1.5 text-gray-500">
                {copied ? <><Check size={12} className="text-green-500" /> Copiado!</> : <><Copy size={12} /> Copiar mensagem</>}
              </button>
              {msgChannel === 'email' && (
                <p className="text-xs text-center text-gray-400">
                  Se o e-mail abrir com caracteres estranhos, use "Copiar mensagem" e cole manualmente.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
