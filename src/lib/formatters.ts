export function formatarMoeda(centavos: number | null | undefined): string {
  if (!centavos) return 'R$ 0,00'
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatarCNPJ(cnpj: string): string {
  const n = (cnpj ?? '').replace(/\D/g, '')
  if (n.length !== 14) return cnpj ?? ''
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatarChaveXML(chave: string): string {
  return (chave ?? '').replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatarWhatsApp(tel: string): string {
  const n = (tel ?? '').replace(/\D/g, '')
  if (n.startsWith('55')) return n
  return '55' + n
}

// Formata o campo order_vehicle que pode ser JSON ou texto simples
// Exemplo JSON: {"license_plate":"FJS8C04","vehicle":{"brand":"VOLKSWAGEN","model":"JETTA","year":"2013","variant":"COMFORTLINE TIPTRONIC"}}
// Exemplo texto: "VOLKSWAGEN JETTA 2013"
export function formatarVeiculo(raw: string | null | undefined): string {
  if (!raw) return ''
  const s = raw.trim()
  // Se não começa com { é texto simples
  if (!s.startsWith('{')) return s
  try {
    const obj = JSON.parse(s)
    const v = obj.vehicle ?? obj
    const parts: string[] = []
    if (v.brand) parts.push(String(v.brand))
    if (v.model) parts.push(String(v.model))
    if (v.year)  parts.push(String(v.year))
    // Adiciona variante se não for muito longa
    if (v.variant && String(v.variant).length <= 40) parts.push(String(v.variant))
    const plate = obj.license_plate ?? v.license_plate
    const label = parts.join(' ')
    return plate ? `${label} · ${plate}` : label
  } catch {
    // Se falhar o parse, trunca e retorna como está
    return s.length > 60 ? s.slice(0, 57) + '...' : s
  }
}

// Separa número da NF da chave XML
// NF-e: "NFe35260510619557000240550010004098621038435173" — chave de 44 dígitos
// Número da NF é os dígitos 26-34 da chave (posição 25 a 33, índice 0)
export function extrairNumeroNF(nfRaw: string | null | undefined): { numero: string; chave: string } {
  if (!nfRaw) return { numero: '', chave: '' }
  const s = nfRaw.trim()
  const digits = s.replace(/\D/g, '')

  // Se tem 44 dígitos é a chave completa
  if (digits.length === 44) {
    // Número da nota está nos dígitos 26-34 (base 1) da chave
    const numero = String(parseInt(digits.slice(25, 34), 10)) // remove zeros à esquerda
    return { numero, chave: digits }
  }

  // Se começa com "NFe" + 44 dígitos
  if (/^NFe\d{44}$/i.test(s)) {
    const chave = s.replace(/^NFe/i, '')
    const numero = String(parseInt(chave.slice(25, 34), 10))
    return { numero, chave }
  }

  // Número simples sem chave
  return { numero: s, chave: '' }
}

export function gerarMensagem(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

export function templatePadrao(): string {
  return `Olá, [Nome do contato no seller]!

Solicito autorização de devolução referente ao pedido abaixo:

Pedido: #{{order_id}}
Empresa: {{cliente_nome}}
CNPJ: {{cnpj_cliente}}
Veículo: {{order_vehicle}}
Data da Solicitação: {{data_solicitacao}}
Seller: {{seller_nome}} | Loja nº {{seller_loja_id}}

Itens a devolver:
{{itens_devolvidos}}

Nota Fiscal nº: {{numero_nf}}
Chave de Acesso NF-e: {{chave_xml_nf}}
Valor total da devolução: {{valor_total_devolucao}}
Motivo: {{motivo}}
Cliente MEI: {{is_mei}}

Aguardo o retorno com as instruções para prosseguir.

Atenciosamente,
[Analista] — ZF [pro]Parts`
}
