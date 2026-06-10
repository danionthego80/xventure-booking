import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { xventureCreateSession } from '@/lib/xventure';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionTitle,
      companyName,
      dynamicUrl,
      sessionDate,
      startTime,
      themeId,
      customerName,
      customerEmail,
      customerPhone,
      paymentIntentId,
    } = body;

    // Get theme details from Supabase
    const { data: theme, error: themeError } = await supabase
      .from('themes')
      .select('*')
      .eq('id', themeId)
      .single();

    if (themeError || !theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 400 });
    }

    // Create session in XVenture using form-based login
    await xventureCreateSession({
      sessionTitle,
      companyName,
      dynamicUrl,
      sessionDate,
      startTime,
      hostIframeUrl: theme.host_iframe_url,
      scoringIframeUrl: theme.scoring_iframe_url,
      virtualWorldIframeUrl: theme.virtual_world_iframe_url,
    });

    // Save booking to Supabase
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        session_title: sessionTitle,
        company_name: companyName,
        dynamic_url: dynamicUrl,
        session_date: sessionDate,
        start_time: startTime,
        theme_id: themeId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_intent_id: paymentIntentId,
        status: 'confirmed',
      });

    if (bookingError) {
      console.error('Supabase booking insert error:', bookingError);
      // Don't fail the request — session was already created in XVenture
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('create-session error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
