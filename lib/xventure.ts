/**
 * XVenture API client utilities
 */

export function formatDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-')
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${day}/${month}/${year} ${String(h12).padStart(2, '0')}:${minutes}:00 ${ampm}`
}

export function addMinutesAndFormat(date: string, time: string, minutes: number): string {
  const dt = new Date(`${date}T${time}:00`)
  dt.setMinutes(dt.getMinutes() + minutes)
  return formatDateTime(dt.toISOString().split('T')[0], dt.toTimeString().substring(0, 5))
}

export async function xventureLogin(): Promise<string> {
  const res = await fetch(`${process.env.XVENTURE_API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.XVENTURE_API_USER, password: process.env.XVENTURE_API_PASS }),
  })
  if (!res.ok) throw new Error(`XVenture login failed (${res.status})`)
  const data = await res.json()
  return data.token || data.access_token
}
