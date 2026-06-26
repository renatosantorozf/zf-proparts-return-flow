// Remove acentos para compatibilidade com mailto: no Outlook Windows
function paraASCII(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
}

export function abrirEmailOutlook(params: {
  to: string
  subject: string
  body: string
}): void {
  const subject = paraASCII(params.subject)
  const body = paraASCII(params.body)
  window.location.href = 'mailto:' + params.to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
}
