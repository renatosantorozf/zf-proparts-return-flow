import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useSyncStatus() {
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncAge, setSyncAge] = useState('')
  const [isStale, setIsStale] = useState(false)

  useEffect(() => {
    async function fetchLastSync() {
      const { data } = await supabase
        .from('sync_log')
        .select('synced_at')
        .eq('status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data && 'synced_at' in data) {
        setLastSync(new Date(data.synced_at as string))
      }
    }
    fetchLastSync()
    const interval = setInterval(fetchLastSync, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!lastSync) return
    function update() {
      const diffMin = Math.floor((Date.now() - lastSync!.getTime()) / 60000)
      if (diffMin < 60) setSyncAge(`${diffMin} min`)
      else setSyncAge(`${Math.floor(diffMin / 60)}h ${diffMin % 60}min`)
      setIsStale(diffMin > 90)
    }
    update()
    const t = setInterval(update, 60000)
    return () => clearInterval(t)
  }, [lastSync])

  return { lastSync, syncAge, isStale }
}
