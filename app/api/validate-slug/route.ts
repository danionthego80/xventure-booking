import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  try {
    const { data, error } = await supabase.from('bookings').select('id').eq('dynamic_url', slug).limit(1)
    if (error) throw error
    return NextResponse.json({ available: data.length === 0 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
