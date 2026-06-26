import { getMeiBadge } from '@/hooks/useMei'
import type { MeiStatus } from '@/types'

export function MeiBadge({ status }: { status: MeiStatus }) {
  const { label, color } = getMeiBadge(status)
  return (
    <span className={`badge ${color} text-xs`}>{label}</span>
  )
}
