import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data: themes, error } = await supabase
      .from('themes')
      .select('id, name, slug, scoring_iframe_url, virtual_world_iframe_url, host_iframe_url')
      .order('name')
    if (error) throw error
    return NextResponse.json({ themes })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch themes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
