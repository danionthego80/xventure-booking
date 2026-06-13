import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { xventureCreateSession } from '@/lib/xventure'
import {
      sendCustomerConfirmation,
      sendAdminNotification,
} from '@/lib/sendEmail'
import type { BookingEmailData } from '@/lib/sendEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

export const runtime = 'nodejs'

export async function POST(request: Request) {
      const body = await request.text()
      const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
      try {
              event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
      } catch (err: unknown) {
              const message = err instanceof Error ? err.message : 'Unknown error'
              console.error('Webhook signature error:', message)
              return NextResponse.json({ error: 'Webhook signature error: ' + message }, { status: 400 })
      }

  if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          const meta = paymentIntent.metadata

        console.log('Payment succeeded for:', meta.session_title, '-- creating XVenture session')

        // Idempotency check
        const { data: existing } = await supabase
            .from('bookings')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntent.id)
            .single()

        if (existing) {
                  console.log('Booking already exists for payment intent', paymentIntent.id, '-- skipping')
                  return NextResponse.json({ ok: true, skipped: true })
        }

        // Look up theme iframes from Supabase using theme_slug
        let hostIframeUrl = 'https://vrlearningagency.com/VirtualWorlds/Dani_Video_040821/index.htm'
          let scoringIframeUrl = ''
          let virtualWorldIframeUrl = ''

        if (meta.theme_slug) {
                  const { data: theme, error: themeErr } = await supabase
                    .from('themes')
                    .select('host_iframe_url, scoring_iframe_url, virtual_world_iframe_url')
                    .eq('slug', meta.theme_slug)
                    .single()
                  if (themeErr) {
                              console.error('Theme lookup error:', themeErr)
                  } else if (theme) {
                              hostIframeUrl = theme.host_iframe_url || hostIframeUrl
                              scoringIframeUrl = theme.scoring_iframe_url || ''
                              virtualWorldIframeUrl = theme.virtual_world_iframe_url || ''
                              console.log('Theme iframes resolved for slug:', meta.theme_slug)
                  }
        } else {
                  console.warn('No theme_slug in metadata — using default host iframe only')
        }

        // Auto-create Mind Games scoring game and build unique scoring link
                const THEME_SLUG_TO_MG_NAME: Record<string, string> = {
                                '2020-games': 'The 2020 Games',
                }
                const mgThemeName = THEME_SLUG_TO_MG_NAME[meta.theme_slug]
                let scoringGameId: string | null = null
                if (mgThemeName) {
                                try {
                                                  const { data: mgTheme } = await supabase
                                                    .from('mg_themes')
                                                    .select('id')
                                                    .eq('name', mgThemeName)
                                                    .single()
                                                  if (mgTheme) {
                                                                      const sessionDateTime = meta.session_date && meta.session_time
                                                                        ? new Date(`${meta.session_date}T${meta.session_time}:00+10:00`).toISOString()
                                                                                            : null
                                                                      const endDateTime = sessionDateTime
                                                                        ? new Date(new Date(sessionDateTime).getTime() + 60 * 60 * 1000).toISOString()
                                                                                            : null
                                                                      const { data: newGame } = await supabase
                                                                        .from('mg_games')
                                                                        .insert({
                                                                                                title: `${meta.session_title} — ${meta.company_name || 'Session'}`,
                                                                                                theme_id: mgTheme.id,
                                                                                                scheduled_start: sessionDateTime,
                                                                                                scheduled_end: endDateTime,
                                                                                                points_per_question: 10,
                                                                                                penalty_mode: 'none',
                                                                                                status: 'draft',
                                                                        })
                                                                        .select('id')
                                                                        .single()
                                                                      if (newGame) {
                                                                                            scoringGameId = newGame.id
                                                                                            scoringIframeUrl = `https://xventure-scoring.vercel.app/score/${scoringGameId}`
                                                                                            console.log('Mind Games scoring game auto-created, unique URL:', scoringIframeUrl)
                                                                      }
                                                  }
                                } catch (mgErr) {
                                                  console.error('Failed to auto-create Mind Games game:', mgErr)
                                }
                }
        // Create XVenture session
        let xventureOk = false
          try {
                    await xventureCreateSession({
                                sessionTitle: meta.session_title,
                                companyName: meta.company_name || '',
                                dynamicUrl: meta.dynamic_url,
                                sessionDate: meta.session_date,
                                startTime: meta.session_time,
                                hostIframeUrl,
                                scoringIframeUrl,
                                virtualWorldIframeUrl,
                    })
                    xventureOk = true
                    console.log('XVenture session created successfully!')
          } catch (err) {
                    console.error('XVenture session creation failed:', err)
          }

        // Save booking to Supabase
        const { error: dbError } = await supabase.from('bookings').insert({
                  session_title: meta.session_title,
                  company_name: meta.company_name,
                  dynamic_url: meta.dynamic_url,
                  theme_slug: meta.theme_slug,
                  theme_name: meta.theme_name,
                  customer_name: meta.customer_name,
                  customer_email: meta.customer_email,
                  customer_phone: meta.customer_phone,
                  session_date: meta.session_date,
                  session_time: meta.session_time,
                  stripe_payment_intent_id: paymentIntent.id,
                  amount_paid: paymentIntent.amount,
                  xventure_created: xventureOk,
                  reminder_7day_sent: false,
                  reminder_day_before_sent: false,
        })

        if (dbError) {
                  console.error('Supabase insert error:', dbError)
        } else {
                  console.log('Booking saved to Supabase')
        }
        // Send emails
        const emailData: BookingEmailData = {
                  sessionTitle: meta.session_title,
                  companyName: meta.company_name,
                  themeName: meta.theme_name || meta.theme_slug,
                  sessionDate: meta.session_date,
                  sessionTime: meta.session_time,
                  dynamicUrl: meta.dynamic_url,
                  customerName: meta.customer_name,
                  customerEmail: meta.customer_email,
                  customerPhone: meta.customer_phone,
                  stripePaymentIntentId: paymentIntent.id,
                  amountPaid: paymentIntent.amount,
        }

        try {
                  await Promise.all([
                              sendCustomerConfirmation(emailData),
                              sendAdminNotification(emailData),
                            ])
                  console.log('Confirmation emails sent')
        } catch (emailErr) {
                  console.error('Email send error:', emailErr)
        }
  }

  if (event.type === 'payment_intent.payment_failed') {
          const paymentIntent = event.data.object as Stripe.PaymentIntent
          console.error('Payment failed for:', paymentIntent.metadata.session_title)
  }

  return NextResponse.json({ ok: true })
}
