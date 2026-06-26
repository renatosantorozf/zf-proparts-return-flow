/**
 * Abre o Outlook com e-mail pré-preenchido usando arquivo .eml
 * Resolve o problema de encoding UTF-8 do mailto: no Outlook Windows
 *
 * O .eml é criado como Blob com Content-Type text/plain; charset=UTF-8
 * e aberto via URL.createObjectURL — o Outlook interpreta corretamente
 */
export function abrirEmailEml(params: {
  to: string
  subject: string
  body: string
}): void {
  const { to, subject, body } = params

  // Codifica subject em Base64 UTF-8 (RFC 2047) para garantir encoding correto
  const subjectEncoded = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`

  // Monta o .eml com headers MIME
  const eml = [
    `To: ${to}`,
    `Subject: ${subjectEncoded}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    body,
  ].join('\r\n')

  // Cria Blob e URL temporária
  const blob = new Blob([eml], { type: 'message/rfc822' })
  const url = URL.createObjectURL(blob)

  // Abre o .eml — o OS associa ao cliente de e-mail padrão (Outlook)
  const a = document.createElement('a')
  a.href = url
  a.download = `devolucao-pedido-${Date.now()}.eml`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Libera a URL após 5s
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
