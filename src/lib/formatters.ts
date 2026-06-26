export function formatarMoeda(centavos: number | null | undefined): string {
  if (!centavos) return 'R$ 0,00'
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export function formatarCNPJ(cnpj: string): string {
  const n = cnpj.replace(/\D/g, '')
  if (n.length !== 14) return cnpj
  return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatarChaveXML(chave: string): string {
  // Agrupa em blocos de 4 dígitos para legibilidade
  return chave.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

export function formatarWhatsApp(tel: string): string {
  // Remove não-dígitos, garante formato internacional Brasil
  const n = tel.replace(/\D/g, '')
  if (n.startsWith('55')) return n
  return '55' + n
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
