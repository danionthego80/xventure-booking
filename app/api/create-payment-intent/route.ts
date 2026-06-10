import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const { amountCents } = await request.json()
    if (!amountCents || typeof amountCents !== 'number') {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'aud',
      automatic_payment_methods: { enabled: true },
      metadata: { source: 'xventure-booking' },
    })
    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create payment intent'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
