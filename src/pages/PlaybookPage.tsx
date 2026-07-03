import { useState, useEffect } from 'react'
import { Pencil, X, Check, ExternalLink, MessageSquare, Mail, Globe, Phone, AlertCircle, BookOpen, RefreshCw } from 'lucide-react'
import { db } from '@/lib/db'
import type { Seller, CanalSeller } from '@/types'

const CANAL_LABELS: Record<CanalSeller, string> = {
  whatsapp: 'WhatsApp', email: 'E-mail', ambos: 'WhatsApp + E-mail', formulario: 'Formulário online',
}
const CANAL_ICONS: Record<CanalSeller, React.ReactNode> = {
  whatsapp: <MessageSquare size={14} />, email: <Mail size={14} />,
  ambos: <Phone size={14} />, formulario: <Globe size={14} />,
}

function isIncomplete(s: Seller) {
  return !s.instrucoes && !s.contato_whatsapp && !s.contato_email
}

function SellerCard({ seller, onEdit }: { seller: Seller; onEdit: () => void }) {
  const canal = (seller.canal_preferencial ?? 'ambos') as CanalSeller
  const incomplete = isIncomplete(seller)
  return (
    <div className={`card p-5 space-y-4 hover:shadow-md transition-shadow ${incomplete ? 'border-amber-200' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">
              {(seller as any).nome_fantasia
                ? <>{(seller as any).nome_fantasia} <span className="text-gray-400 font-normal text-sm">· {seller.merchant_name}</span></>
                : seller.merchant_name}
            </h3>
            {incomplete && (
              <span className="badge bg-amber-100 text-amber-700 text-xs flex items-center gap-1">
                <AlertCircle size={10} /> Completar
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">#{seller.merchant_reference}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-zf-blue-light text-zf-blue flex items-center gap-1">
            {CANAL_ICONS[canal]}{CANAL_LABELS[canal]}
          </span>
          <button onClick={onEdit} className="btn-ghost p-1.5"><Pencil size={14} /></button>
        </div>
      </div>

      {incomplete ? (
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs text-amber-700">
            Seller importado automaticamente. Clique em editar para adicionar contato e instruções de devolução.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {seller.contato_nome && <div><p className="text-xs text-gray-400">Contato</p><p className="font-medium text-gray-700">{seller.contato_nome}</p></div>}
            {seller.contato_whatsapp && (
              <div><p className="text-xs text-gray-400">WhatsApp</p>
                <a href={`https://wa.me/55${seller.contato_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-green-700 hover:underline flex items-center gap-1">
                  {seller.contato_whatsapp} <ExternalLink size={11} />
                </a>
              </div>
            )}
            {seller.contato_email && (
              <div><p className="text-xs text-gray-400">E-mail</p>
                <a href={`mailto:${seller.contato_email}`} className="font-medium text-zf-blue hover:underline flex items-center gap-1">
                  {seller.contato_email} <ExternalLink size={11} />
                </a>
              </div>
            )}
            {seller.url_formulario && (
              <div><p className="text-xs text-gray-400">Formulário</p>
                <a href={seller.url_formulario} target="_blank" rel="noopener noreferrer"
                  className="font-medium text-purple-700 hover:underline flex items-center gap-1 truncate">
                  Abrir formulário <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
          {seller.instrucoes && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1"><BookOpen size={12} /> Processo</p>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{seller.instrucoes}</p>
            </div>
          )}
          {seller.regras_excecao && (
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1"><AlertCircle size={12} /> Regras / Exceções</p>
              <p className="text-sm text-amber-900 whitespace-pre-wrap">{seller.regras_excecao}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SellerForm({ seller, onSave, onCancel }: {
  seller: Seller
  onSave: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Record<string, string>>({
    nome_fantasia: (seller as any).nome_fantasia ?? '',
    canal_preferencial: seller.canal_preferencial ?? 'ambos',
    contato_nome: seller.contato_nome ?? '',
    contato_email: seller.contato_email ?? '',
    contato_whatsapp: seller.contato_whatsapp ?? '',
    url_formulario: seller.url_formulario ?? '',
    instrucoes: seller.instrucoes ?? '',
    regras_excecao: seller.regras_excecao ?? '',
    template_mensagem: seller.template_mensagem ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await db.from('sellers').update({
      ...form,
      updated_at: new Date().toISOString()
    }).eq('id', seller.id)
    setSaving(false)
    onSave()
  }

  const lc = 'block text-sm font-medium text-gray-700 mb-1'
  const sc = 'space-y-4 border-t border-gray-100 pt-4'

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold text-gray-900 text-lg">{seller.merchant_name}</h2>
        <p className="text-sm text-gray-500 mt-0.5">#{seller.merchant_reference}</p>
      </div>

      {/* Nome Fantasia */}
      <div>
        <label className={lc}>Nome Fantasia <span className="text-gray-400 font-normal">(opcional)</span></label>
        <input
          value={form.nome_fantasia ?? ''}
          onChange={e => set('nome_fantasia', e.target.value)}
          className="input"
          placeholder="Ex: SKY Automotive, Compel Pecas..."
        />
      </div>

      {/* Canal */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Canal preferencial</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(CANAL_LABELS) as [CanalSeller, string][]).map(([val, label]) => (
            <label key={val} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
              form.canal_preferencial === val
                ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}>
              <input type="radio" name="canal" value={val} checked={form.canal_preferencial === val}
                onChange={() => set('canal_preferencial', val)} className="sr-only" />
              {CANAL_ICONS[val]}{label}
            </label>
          ))}
        </div>
      </div>

      {/* Contatos */}
      <div className={sc}>
        <p className="text-sm font-semibold text-gray-700">Dados de contato</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={lc}>Nome do contato</label>
            <input value={form.contato_nome} onChange={e => set('contato_nome', e.target.value)} className="input" placeholder="Nome do responsável" /></div>
          <div><label className={lc}><span className="flex items-center gap-1"><MessageSquare size={13} /> WhatsApp</span></label>
            <input value={form.contato_whatsapp} onChange={e => set('contato_whatsapp', e.target.value)} className="input" placeholder="(11) 99999-9999" /></div>
          <div><label className={lc}><span className="flex items-center gap-1"><Mail size={13} /> E-mail</span></label>
            <input type="email" value={form.contato_email} onChange={e => set('contato_email', e.target.value)} className="input" placeholder="devolucoes@seller.com.br" /></div>
          <div><label className={lc}><span className="flex items-center gap-1"><Globe size={13} /> URL do formulário</span></label>
            <input type="url" value={form.url_formulario} onChange={e => set('url_formulario', e.target.value)} className="input" placeholder="https://..." /></div>
        </div>
      </div>

      {/* Processo */}
      <div className={sc}>
        <p className="text-sm font-semibold text-gray-700">Processo de devolução</p>
        <div><label className={lc}>Instruções passo-a-passo</label>
          <textarea value={form.instrucoes} onChange={e => set('instrucoes', e.target.value)}
            className="input resize-none" rows={4} placeholder="Descreva o processo..." /></div>
        <div><label className={lc}>Regras / Exceções</label>
          <textarea value={form.regras_excecao} onChange={e => set('regras_excecao', e.target.value)}
            className="input resize-none" rows={2} placeholder="Ex: Apenas SP e MG. Prazo máximo 30 dias." /></div>
        <div><label className={lc}>Template de mensagem personalizado</label>
          <textarea value={form.template_mensagem} onChange={e => set('template_mensagem', e.target.value)}
            className="input resize-none font-mono text-xs" rows={4}
            placeholder={"Deixe em branco para usar o template padrão.\nVariáveis: {{order_id}}, {{cliente_nome}}, {{itens_devolvidos}}, {{numero_nf}}, {{motivo}}"} /></div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          <X size={14} className="inline mr-1" />Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Salvando...' : <><Check size={14} className="inline mr-1" />Salvar</>}
        </button>
      </div>
    </form>
  )
}

export default function PlaybookPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Seller | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'todos' | 'incompletos'>('todos')

  async function load() {
    setLoading(true)
    const { data } = await db.from('sellers').select('*').order('merchant_name')
    setSellers((data ?? []) as Seller[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const incompletos = sellers.filter(isIncomplete)

  const filtered = sellers.filter(s => {
    const matchSearch = s.merchant_name.toLowerCase().includes(search.toLowerCase()) ||
      s.merchant_reference.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'todos' || isIncomplete(s)
    return matchSearch && matchFilter
  })

  if (editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(null)} className="btn-ghost text-sm">← Voltar</button>
          <h1 className="text-xl font-bold text-gray-900">Completar Playbook</h1>
        </div>
        <SellerForm
          seller={editing}
          onSave={() => { setEditing(null); load() }}
          onCancel={() => setEditing(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sellers / Playbook</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sellers importados automaticamente da planilha. Complete o processo de devolução de cada um.
          </p>
        </div>
        <button onClick={load} className="btn-ghost text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Alerta de sellers incompletos */}
      {incompletos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">
            <strong>{incompletos.length} seller{incompletos.length > 1 ? 's' : ''}</strong> sem contato ou instruções cadastradas
          </p>
          <button
            onClick={() => setFilter(filter === 'incompletos' ? 'todos' : 'incompletos')}
            className="text-xs font-medium text-amber-700 underline whitespace-nowrap"
          >
            {filter === 'incompletos' ? 'Ver todos' : 'Ver apenas incompletos'}
          </button>
        </div>
      )}

      {/* Busca */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar seller por nome ou referência..." className="input max-w-md" />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-zf-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-3">
          <BookOpen size={32} className="mx-auto text-gray-300" />
          <p className="font-medium text-gray-600">
            {search ? 'Nenhum seller encontrado' : 'Nenhum seller importado ainda'}
          </p>
          {!search && (
            <p className="text-sm">Importe o order.xlsx em Configurações para carregar os sellers automaticamente.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(seller => (
            <SellerCard key={seller.id} seller={seller} onEdit={() => setEditing(seller)} />
          ))}
        </div>
      )}
    </div>
  )
}
