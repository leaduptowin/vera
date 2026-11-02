export function formatClock(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDurationCompact(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(safe % 60).padStart(2, '0')}s`
}

export function formatTimestamp(ts: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

export function formatSessionDate(ts: number) {
  const date = new Date(ts)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return `今天 ${formatTimestamp(ts)}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (wasYesterday) return `昨天 ${formatTimestamp(ts)}`

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatFullDate(ts: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

export function formatRelative(ts: number) {
  const delta = Math.max(0, Date.now() - ts)
  if (delta < 15_000) return '刚刚'
  if (delta < 60_000) return `${Math.floor(delta / 1000)} 秒前`
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
  return formatSessionDate(ts)
}
