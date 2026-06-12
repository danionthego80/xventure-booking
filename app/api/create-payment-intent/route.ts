import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

export async function POST(req: NextRequest) {
    try {
          const body = await req.json();
          const {
                  sessionTitle,
                  companyName,
                  dynamicUrl,
                  sessionDate,
                  sessionTime,
                  themeId,
                  themeName,
                  themeSlug,
                  customerName,
                  customerEmail,
                  customerPhone,
          } = body;

      const paymentIntent = await stripe.paymentIntents.create({
              amount: 108900, // AUD $1,089.00 inc GST
              currency: 'aud',
              automatic_payment_methods: { enabled: true },
              receipt_email: customerEmail,
              description: `XVenture Session: ${sessionTitle} — ${companyName}`,
              metadata: {
                        // snake_case keys to match what stripe-webhook reads
                session_title: sessionTitle || '',
                        company_name: companyName || '',
                        dynamic_url: dynamicUrl || '',
                        session_date: sessionDate || '',
                        session_time: sessionTime || '',
                        theme_id: themeId || '',
                        theme_slug: themeSlug || '',
                        theme_name: themeName || '',
                        customer_name: customerName || '',
                        customer_email: customerEmail || '',
                        customer_phone: customerPhone || '',
              },
      });

      return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('create-payment-intent error:', message);
          return NextResponse.json({ error: message }, { status: 500 });
    }
}
