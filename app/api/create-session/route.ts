import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function buildDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-')
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${day}/${month}/${year} ${String(h12).padStart(2, '0')}:${minutes}:00 ${ampm}`
}

function addMins(date: string, time: string, mins: number): string {
  const dt = new Date(`${date}T${time}:00`)
  dt.setMinutes(dt.getMinutes() + mins)
  return buildDateTime(dt.toISOString().split('T')[0], dt.toTimeString().substring(0, 5))
}

async function xventureLogin(): Promise<string> {
  const res = await fetch(`${process.env.XVENTURE_API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.XVENTURE_API_USER, password: process.env.XVENTURE_API_PASS }),
  })
  if (!res.ok) throw new Error('XVenture login failed')
  const data = await res.json()
  return data.token || data.access_token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionTitle, companyName, dynamicUrl, sessionDate, sessionTime, themeId, contactName, contactEmail, contactPhone, clientSecret } = body

    if (!sessionTitle || !companyName || !sessionDate || !themeId || !contactEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: theme, error: themeError } = await supabase.from('themes').select('*').eq('id', themeId).single()
    if (themeError || !theme) throw new Error('Theme not found')

    const token = await xventureLogin()

    const sessionPayload = {
      session_title: sessionTitle,
      company_name: companyName,
      dynamic_url: dynamicUrl,
      host_start_date_time: buildDateTime(sessionDate, sessionTime),
      host_iframe_url: theme.host_iframe_url,
      scoring_iframe_url: theme.scoring_iframe_url,
      virtual_world_iframe_url: theme.virtual_world_iframe_url,
      scoring_start_date_time: addMins(sessionDate, sessionTime, 15),
      scoring_end_date_time: addMins(sessionDate, sessionTime, 20),
      valid: '1',
    }

    const xvRes = await fetch(`${process.env.XVENTURE_API_BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sessionPayload),
    })
    if (!xvRes.ok) throw new Error(`XVenture session creation failed: ${await xvRes.text()}`)
    const xvData = await xvRes.json()
    const sessionId = xvData.id || xvData.session_id

    await supabase.from('bookings').insert({
      session_title: sessionTitle,
      company_name: companyName,
      dynamic_url: dynamicUrl,
      session_date: sessionDate,
      session_time: sessionTime,
      theme_id: themeId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      stripe_payment_intent_id: clientSecret?.split('_secret_')[0] || null,
      xventure_session_id: String(sessionId),
      status: 'pending_payment',
    })

    console.log('New booking:', { sessionTitle, companyName, contactEmail, sessionId })

    return NextResponse.json({ success: true, sessionId, clientSecret })
  } catch (err: unknown) {
    console.error('create-session error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
