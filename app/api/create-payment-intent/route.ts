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
      startTime,
      themeId,
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
        sessionTitle,
        companyName,
        dynamicUrl,
        sessionDate,
        startTime,
        themeId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('create-payment-intent error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
