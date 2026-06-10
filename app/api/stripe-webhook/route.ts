import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { xventureCreateSession } from '@/lib/xventure';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    console.error('Webhook signature error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const m = pi.metadata;

      console.log('Payment succeeded for:', m.sessionTitle, '— creating XVenture session');

      // Get theme details from Supabase
      const { data: theme } = await supabase
        .from('themes')
        .select('*')
        .eq('id', m.themeId)
        .single();

      if (theme) {
        // Create XVenture session
        await xventureCreateSession({
          sessionTitle: m.sessionTitle,
          companyName: m.companyName,
          dynamicUrl: m.dynamicUrl,
          sessionDate: m.sessionDate,
          startTime: m.startTime,
          hostIframeUrl: theme.host_iframe_url,
          scoringIframeUrl: theme.scoring_iframe_url,
          virtualWorldIframeUrl: theme.virtual_world_iframe_url,
        });
        console.log('XVenture session created successfully');
      } else {
        console.error('Theme not found for id:', m.themeId);
      }

      // Save booking to Supabase
      const { error: bookingError } = await supabase.from('bookings').insert({
        session_title: m.sessionTitle,
        company_name: m.companyName,
        dynamic_url: m.dynamicUrl,
        session_date: m.sessionDate,
        start_time: m.startTime,
        theme_id: m.themeId,
        customer_name: m.customerName,
        customer_email: m.customerEmail,
        customer_phone: m.customerPhone || '',
        stripe_payment_intent_id: pi.id,
        status: 'confirmed',
      });

      if (bookingError) {
        console.error('Supabase booking insert error:', bookingError.message);
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.error('Payment failed for intent:', pi.id);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook handler error:', message);
    // Return 200 so Stripe doesn't retry — log the error for investigation
    return NextResponse.json({ error: message }, { status: 200 });
  }

  return NextResponse.json({ received: true });
}
