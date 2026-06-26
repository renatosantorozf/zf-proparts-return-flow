// Feriados nacionais brasileiros (fixos + móveis principais)
const FERIADOS_FIXOS: [number, number][] = [
  [1, 1],   // Confraternização Universal
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [12, 25], // Natal
]

function isFeriado(date: Date): boolean {
  const m = date.getMonth() + 1
  const d = date.getDate()
  return FERIADOS_FIXOS.some(([fm, fd]) => fm === m && fd === d)
}

function isDiaUtil(date: Date): boolean {
  const dow = date.getDay()
  return dow !== 0 && dow !== 6 && !isFeriado(date)
}

export function calcularDiasUteis(inicio: Date, fim: Date): number {
  let count = 0
  const cur = new Date(inicio)
  cur.setHours(0, 0, 0, 0)
  const end = new Date(fim)
  end.setHours(0, 0, 0, 0)
  while (cur < end) {
    if (isDiaUtil(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
