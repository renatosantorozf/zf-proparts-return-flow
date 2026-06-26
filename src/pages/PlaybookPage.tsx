import { useState, useEffect } from 'react'
import {
  Plus, Pencil, X, Check, ExternalLink,
  MessageSquare, Mail, Globe, Phone, AlertCircle, BookOpen
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Seller, CanalSeller } from '@/types'

const CANAL_LABELS: Record<CanalSeller, string> = {
  whatsapp:  'WhatsApp',
  email:     'E-mail',
  ambos:     'WhatsApp + E-mail',
  formulario:'Formulário online',
}

const CANAL_ICONS: Record<CanalSeller, React.ReactNode> = {
  whatsapp:   <MessageSquare size={14} />,
  email:      <Mail size={14} />,
  ambos:      <Phone size={14} />,
  formulario: <Globe size={14} />,
}

const EMPTY_SELLER: Omit<Seller, 'id' | 'created_at' | 'updated_at'> = {
  merchant_reference: '',
  merchant_name: '',
  canal_preferencial: 'ambos',
  contato_nome: '',
  contato_email: '',
  contato_whatsapp: '',
  url_formulario: '',
  instrucoes: '',
  template_mensagem: '',
  regras_excecao: '',
}

function SellerCard({ seller, onEdit }: { seller: Seller; onEdit: () => void }) {
  const canal = seller.canal_preferencial ?? 'ambos'
  return (
    <div className="card p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-gray-900">{seller.merchant_name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Loja #{seller.merchant_reference}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-zf-blue-light text-zf-blue flex items-center gap-1">
            {CANAL_ICONS[canal as CanalSeller]}
            {CANAL_LABELS[canal as CanalSeller]}
          </span>
          <button onClick={onEdit} className="btn-ghost p-1.5">
            <Pencil size={14} />
          </button>
        </div>
      </div>

      {/* Contatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        {seller.contato_nome && (
          <div>
            <p className="text-xs text-gray-400">Contato</p>
            <p className="font-medium text-gray-700">{seller.contato_nome}</p>
          </div>
        )}
        {seller.contato_whatsapp && (
          <div>
            <p className="text-xs text-gray-400">WhatsApp</p>
            <a
              href={`https://wa.me/55${seller.contato_whatsapp.replace(/\D/g,'')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-green-700 hover:underline flex items-center gap-1"
            >
              {seller.contato_whatsapp} <ExternalLink size={11} />
            </a>
          </div>
        )}
        {seller.contato_email && (
          <div>
            <p className="text-xs text-gray-400">E-mail</p>
            <a href={`mailto:${seller.contato_email}`}
              className="font-medium text-zf-blue hover:underline flex items-center gap-1">
              {seller.contato_email} <ExternalLink size={11} />
            </a>
          </div>
        )}
        {seller.url_formulario && (
          <div>
            <p className="text-xs text-gray-400">Formulário</p>
            <a href={seller.url_formulario} target="_blank" rel="noopener noreferrer"
              className="font-medium text-purple-700 hover:underline flex items-center gap-1 truncate">
              Abrir formulário <ExternalLink size={11} />
            </a>
          </div>
        )}
      </div>

      {/* Instruções */}
      {seller.instrucoes && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
            <BookOpen size={12} /> Processo de devolução
          </p>
          <p className="text-sm text-blue-900 whitespace-pre-wrap">{seller.instrucoes}</p>
        </div>
      )}

      {/* Regras de exceção */}
      {seller.regras_excecao && (
        <div className="bg-amber-50 rounded-lg p-3">
          <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Regras / Exceções
          </p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{seller.regras_excecao}</p>
        </div>
      )}
    </div>
  )
}

function SellerForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<Seller, 'id' | 'created_at' | 'updated_at'>
  onSave: (data: Omit<Seller, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.merchant_name.trim()) { setError('Nome do seller é obrigatório'); return }
    if (!form.merchant_reference.trim()) { setError('Número da loja é obrigatório'); return }
    setSaving(true)
    setError('')
    await onSave(form)
    setSaving(false)
  }

  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'
  const sectionCls = 'space-y-4 border-t border-gray-100 pt-4'

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <h2 className="font-bold text-gray-900 text-lg">
        {initial.merchant_name ? `Editar: ${initial.merchant_name}` : 'Novo Seller'}
      </h2>

      {/* Identificação */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nome do Seller *</label>
          <input value={form.merchant_name} onChange={e => set('merchant_name', e.target.value)}
            className="input" placeholder="Ex: SKY, Compel..." required />
        </div>
        <div>
          <label className={labelCls}>Nº da Loja no [pro]Parts *</label>
          <input value={form.merchant_reference} onChange={e => set('merchant_reference', e.target.value)}
            className="input" placeholder="Ex: 12345" required />
        </div>
      </div>

      {/* Canal preferencial */}
      <div className={sectionCls}>
        <p className="text-sm font-semibold text-gray-700">Canal preferencial de contato</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(CANAL_LABELS) as [CanalSeller, string][]).map(([val, label]) => (
            <label key={val} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
              form.canal_preferencial === val
                ? 'border-zf-blue bg-zf-blue-light text-zf-blue font-medium'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}>
              <input type="radio" name="canal" value={val}
                checked={form.canal_preferencial === val}
                onChange={() => set('canal_preferencial', val)}
                className="sr-only" />
              {CANAL_ICONS[val]}
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Contatos */}
      <div className={sectionCls}>
        <p className="text-sm font-semibold text-gray-700">Dados de contato</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nome do contato</label>
            <input value={form.contato_nome ?? ''} onChange={e => set('contato_nome', e.target.value)}
              className="input" placeholder="Nome do responsável" />
          </div>
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><MessageSquare size={13} /> WhatsApp</span>
            </label>
            <input value={form.contato_whatsapp ?? ''} onChange={e => set('contato_whatsapp', e.target.value)}
              className="input" placeholder="(11) 99999-9999" />
          </div>
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Mail size={13} /> E-mail</span>
            </label>
            <input type="email" value={form.contato_email ?? ''} onChange={e => set('contato_email', e.target.value)}
              className="input" placeholder="devolucoes@seller.com.br" />
          </div>
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Globe size={13} /> URL do formulário</span>
            </label>
            <input type="url" value={form.url_formulario ?? ''} onChange={e => set('url_formulario', e.target.value)}
              className="input" placeholder="https://..." />
          </div>
        </div>
      </div>

      {/* Processo */}
      <div className={sectionCls}>
        <p className="text-sm font-semibold text-gray-700">Processo de devolução / garantia</p>
        <div>
          <label className={labelCls}>Instruções passo-a-passo</label>
          <textarea value={form.instrucoes ?? ''} onChange={e => set('instrucoes', e.target.value)}
            className="input resize-none" rows={4}
            placeholder="Descreva o processo: o que precisa enviar, em qual canal, documentos necessários..." />
        </div>
        <div>
          <label className={labelCls}>Regras / Exceções</label>
          <textarea value={form.regras_excecao ?? ''} onChange={e => set('regras_excecao', e.target.value)}
            className="input resize-none" rows={2}
            placeholder="Ex: Apenas unidades de SP e MG. Prazo máximo de 30 dias." />
        </div>
        <div>
          <label className={labelCls}>Template de mensagem personalizado</label>
          <textarea value={form.template_mensagem ?? ''} onChange={e => set('template_mensagem', e.target.value)}
            className="input resize-none font-mono text-xs" rows={5}
            placeholder="Deixe em branco para usar o template padrão.&#10;Variáveis disponíveis: {{order_id}}, {{cliente_nome}}, {{cnpj_cliente}}, {{itens_devolvidos}}, {{numero_nf}}, {{motivo}}" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          <X size={14} className="inline mr-1" /> Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Salvando...' : <><Check size={14} className="inline mr-1" /> Salvar</>}
        </button>
      </div>
    </form>
  )
}

export default function PlaybookPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Seller | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await (supabase
      .from('sellers')
      .select('*')
      .order('merchant_name') as any)
    setSellers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(data: Omit<Seller, 'id' | 'created_at' | 'updated_at'>) {
    if (editing) {
      await (supabase.from('sellers').update({
        ...data, updated_at: new Date().toISOString()
      }).eq('id', editing.id) as any)
      setEditing(null)
    } else {
      await (supabase.from('sellers').insert(data) as any)
      setCreating(false)
    }
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este seller do playbook?')) return
    await (supabase.from('sellers').delete().eq('id', id) as any)
    load()
  }

  const filtered = sellers.filter(s =>
    s.merchant_name.toLowerCase().includes(search.toLowerCase()) ||
    s.merchant_reference.includes(search)
  )

  if (creating || editing) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setCreating(false); setEditing(null) }} className="btn-ghost text-sm">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {editing ? 'Editar Seller' : 'Novo Seller'}
          </h1>
        </div>
        <SellerForm
          initial={editing
            ? { merchant_reference: editing.merchant_reference, merchant_name: editing.merchant_name,
                canal_preferencial: editing.canal_preferencial ?? 'ambos',
                contato_nome: editing.contato_nome ?? '',
                contato_email: editing.contato_email ?? '',
                contato_whatsapp: editing.contato_whatsapp ?? '',
                url_formulario: editing.url_formulario ?? '',
                instrucoes: editing.instrucoes ?? '',
                template_mensagem: editing.template_mensagem ?? '',
                regras_excecao: editing.regras_excecao ?? '' }
            : EMPTY_SELLER}
          onSave={handleSave}
          onCancel={() => { setCreating(false); setEditing(null) }}
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
            Processo de devolução e contatos de cada seller
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={15} /> Novo Seller
        </button>
      </div>

      {/* Busca */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar seller por nome ou nº da loja..."
        className="input max-w-md"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-zf-blue" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-3">
          <BookOpen size={32} className="mx-auto text-gray-300" />
          <p className="font-medium text-gray-600">
            {search ? 'Nenhum seller encontrado' : 'Nenhum seller cadastrado ainda'}
          </p>
          {!search && (
            <p className="text-sm">
              Cadastre os sellers com seus processos de devolução para que apareçam
              automaticamente nos tickets.
            </p>
          )}
          {!search && (
            <button onClick={() => setCreating(true)} className="btn-primary text-sm mx-auto">
              <Plus size={14} className="inline mr-1" /> Cadastrar primeiro seller
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(seller => (
            <div key={seller.id} className="relative group">
              <SellerCard seller={seller} onEdit={() => setEditing(seller)} />
              <button
                onClick={() => handleDelete(seller.id)}
                className="absolute top-3 right-12 opacity-0 group-hover:opacity-100 transition-opacity btn-ghost p-1.5 text-red-400 hover:text-red-600"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
