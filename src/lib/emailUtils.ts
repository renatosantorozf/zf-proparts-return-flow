/**
 * Converte texto UTF-8 para ASCII removendo acentos
 * Necessário para mailto: no Outlook Windows que interpreta como latin-1
 */
export function paraASCII(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos (acentos)
    .replace(/[^\x00-\x7F]/g, c => {
      // Caracteres especiais comuns que não são cobertos pelo NFD
      const map: Record<string, string> = {
        'ç': 'c', 'Ç': 'C',
        'ã': 'a', 'Ã': 'A',
        'õ': 'o', 'Õ': 'O',
        '·': '·', '—': '-', '–': '-',
        '"': '"', '"': '"', ''': "'", ''': "'",
        '…': '...',
      }
      return map[c] ?? c
    })
}

/**
 * Abre Outlook via mailto: com corpo em ASCII para evitar encoding quebrado
 * O Outlook no Windows não suporta UTF-8 em mailto: — usa latin-1 por padrão
 */
export function abrirEmailOutlook(params: {
  to: string
  subject: string
  body: string
}): void {
  const { to, body } = params

  // Assunto em ASCII
  const subject = paraASCII(params.subject)

  // Corpo em ASCII — remove acentos mas mantém o texto legível
  const bodyASCII = paraASCII(body)

  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyASCII)}`
  window.location.href = mailto
}
