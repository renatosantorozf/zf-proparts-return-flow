/**
 * Remove acentos e caracteres não-ASCII para compatibilidade com mailto: no Outlook Windows
 */
function paraASCII(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, c => {
      const map: Record<string, string> = {
        'ç': 'c', 'Ç': 'C', 'ã': 'a', 'Ã': 'A', 'õ': 'o', 'Õ': 'O',
        '·': '.', '—': '-', '–': '-', '"': '"', '"': '"', ''': "'", ''': "'", '…': '...',
      }
      return map[c] ?? ''
    })
}

/**
 * Abre Outlook via mailto: com corpo em ASCII puro
 * Resolve o problema de encoding UTF-8 no Outlook Windows
 */
export function abrirEmailOutlook(params: {
  to: string
  subject: string
  body: string
}): void {
  const subject = paraASCII(params.subject)
  const body = paraASCII(params.body)
  window.location.href = `mailto:${params.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
