import { useState } from 'react'
import { Copy, Check, Car, Package, FileText, Key } from 'lucide-react'
import { MeiBadge } from './MeiBadge'
import { useMei } from '@/hooks/useMei'
import { formatarCNPJ, formatarChaveXML } from '@/lib/formatters'
import type { OrderPreview, OrderRow, TicketItem } from '@/types'

interface SelectedItem extends Omit<TicketItem, 'id' | 'ticket_id'> {
  selected: boolean
  _sellerIdx: number
  _rowIdx: number
}

interface OrderPreviewPanelProps {
  order: OrderPreview
  onConfirm: (items: Omit<TicketItem, 'id' | 'ticket_id'>[], devolucaoTipo: 'total' | 'parcial', valorTotal: number) => void
  onCancel: () => void
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="ml-1 text-gray-400 hover:text-gray-600 transition-colors" title="Copiar">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

const SELLER_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
]

export function OrderPreviewPanel({ order, onConfirm, onCancel }: OrderPreviewPanelProps) {
  const { status: meiStatus } = useMei(order.company_cnpj)

  // Cada linha da planilha = 1 item, qtd sempre 1, desmarcado por padrao
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(() =>
    order.sellers.flatMap((s, si) =>
      s.items.map((item: OrderRow, ri: number) => ({
        selected: false,
        _sellerIdx: si,
        _rowIdx: ri,
        item_sku: item.item_sku,
        item_brand: item.item_brand ?? undefined,
        item_part_number: item.item_part_number ?? undefined,
        item_name: item.item_name ?? undefined,
        item_net_price: item.item_net_price ?? undefined,
        qtd_original: 1,
        qtd_devolvida: 1,
        valor_devolvido: item.item_net_price ?? 0,
        merchant_reference: item.merchant_reference ?? undefined,
        merchant_name: item.merchant_name ?? s.merchant_name,
      }))
    )
  )

  function toggleItem(si: number, ri: number) {
    setSelectedItems(prev => prev.map(i =>
      i._sellerIdx === si && i._rowIdx === ri ? { ...i, selected: !i.selected } : i
    ))
  }

  const selected = selectedItems.filter(i => i.selected)
  const isTotal = selected.length === selectedItems.length && selected.length > 0

  function handleConfirm() {
    if (selected.length === 0) return
    const items = selected.map(({ selected: _s, _sellerIdx: _si, _rowIdx: _ri, ...rest }) => rest)
    onConfirm(items, isTotal ? 'total' : 'parcial', 0)
  }

  return (
    <div className="space-y-5">
      {/* Cabecalho */}
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Pedido</p>
            <p className="font-bold text-gray-900 text-lg">#{order.id_sales_order}</p>
          </div>
          <MeiBadge status={meiStatus} />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Empresa</p>
            <p className="font-medium text-gray-800">{order.company_name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">CNPJ</p>
            <p className="font-medium text-gray-800">{formatarCNPJ(order.company_cnpj)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Cidade / Estado</p>
            <p className="font-medium text-gray-800">
              {order.order_city}{order.order_state ? ' / ' + order.order_state : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Data do pedido</p>
            <p className="font-medium text-gray-800">
              {order.order_created_at
                ? new Date(order.order_created_at).toLocaleDateString('pt-BR')
                : '—'}
            </p>
          </div>
        </div>

        {order.order_vehicle && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <Car size={15} className="text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-700">{order.order_vehicle}</span>
          </div>
        )}

        {(order.numero_nf || order.chave_xml_nf) && (
          <div className="space-y-1.5">
            {order.numero_nf && (
              <div className="flex items-center gap-2 text-sm">
                <FileText size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-500">NF n</span>
                <span className="font-mono font-semibold text-gray-800">{order.numero_nf}</span>
                <CopyButton text={order.numero_nf} />
              </div>
            )}
            {order.chave_xml_nf && (
              <div className="flex items-start gap-2 text-sm">
                <Key size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <span className="text-gray-500 shrink-0">Chave NF-e</span>
                <span className="font-mono text-xs text-gray-600 break-all leading-relaxed">
                  {formatarChaveXML(order.chave_xml_nf)}
                </span>
                <CopyButton text={order.chave_xml_nf} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Itens por seller */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Package size={15} />
          Selecione os itens
          {selected.length > 0
            ? <span className="badge bg-zf-blue-light text-zf-blue">{selected.length} selecionado{selected.length > 1 ? 's' : ''}</span>
            : <span className="text-xs text-gray-400 font-normal">(nenhum selecionado)</span>
          }
        </p>

        {order.sellers.map((seller, si) => (
          <div key={seller.merchant_reference + si} className="card overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 bg-gray-50">
              <span className={'badge ' + SELLER_COLORS[si % SELLER_COLORS.length] + ' font-medium'}>
                {seller.merchant_name}
              </span>
              {seller.merchant_reference && (
                <span className="text-xs text-gray-400">#{seller.merchant_reference}</span>
              )}
            </div>

            <div className="divide-y divide-gray-50">
              {seller.items.map((item: OrderRow, ri: number) => {
                const sel = selectedItems.find(s => s._sellerIdx === si && s._rowIdx === ri)
                if (!sel) return null
                return (
                  <label
                    key={si + '-' + ri}
                    className={'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ' +
                      (sel.selected ? 'bg-blue-50' : 'hover:bg-gray-50')}
                  >
                    <input
                      type="checkbox"
                      checked={sel.selected}
                      onChange={() => toggleItem(si, ri)}
                      className="mt-0.5 rounded border-gray-300 text-zf-blue focus:ring-zf-blue cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={'text-sm font-medium leading-snug ' +
                        (sel.selected ? 'text-gray-900' : 'text-gray-500')}>
                        {item.item_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.item_sku}
                        {item.item_brand ? ' · ' + item.item_brand : ''}
                        {item.item_state ? ' · ' + item.item_state : ''}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Rodape */}
      <div className="card p-4 sticky bottom-0 bg-white border-t-2 border-zf-blue shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            {selected.length === 0
              ? <p className="text-sm text-gray-400">Selecione ao menos 1 item</p>
              : <p className="text-sm font-medium text-gray-800">
                  {selected.length} {selected.length === 1 ? 'item' : 'itens'} selecionado{selected.length > 1 ? 's' : ''}
                  {' · '}
                  <span className={isTotal ? 'text-gray-600' : 'text-amber-700'}>
                    {isTotal ? 'Devolucao total' : 'Devolucao parcial'}
                  </span>
                </p>
            }
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleConfirm} disabled={selected.length === 0} className="btn-primary text-sm">
              Criar Ticket →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
