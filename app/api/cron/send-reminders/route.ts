import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
    sendSevenDayReminder,
    sendDayBeforeReminder,
} from '@/lib/sendEmail'
import type { BookingEmailData } from '@/lib/sendEmail'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Verify this is called by Vercel Cron
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(today.getDate() + 7)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const toDateStr = (d: Date) => d.toISOString().split('T')[0]

    const sevenDayDateStr = toDateStr(sevenDaysFromNow)
    const tomorrowDateStr = toDateStr(tomorrow)

    const results: string[] = []

    // Fetch sessions in 7 days
    const { data: sevenDayBookings, error: err7 } = await supabase
        .from('bookings')
        .select('*')
        .eq('session_date', sevenDayDateStr)
        .eq('reminder_7day_sent', false)

    if (err7) {
        console.error('7-day query error:', err7)
    } else {
        for (const booking of (sevenDayBookings || [])) {
            try {
                const emailData: BookingEmailData = {
                    sessionTitle: booking.session_title,
                    companyName: booking.company_name,
                    themeName: booking.theme_name || booking.theme_slug,
                    sessionDate: booking.session_date,
                    sessionTime: booking.session_time,
                    dynamicUrl: booking.dynamic_url,
                    customerName: booking.customer_name,
                    customerEmail: booking.customer_email,
                    customerPhone: booking.customer_phone,
                    stripePaymentIntentId: booking.stripe_payment_intent_id,
                }
                await sendSevenDayReminder(emailData)
                await supabase
                    .from('bookings')
                    .update({ reminder_7day_sent: true })
                    .eq('id', booking.id)
                results.push(`7-day reminder sent to ${booking.customer_email}`)
            } catch (e) {
                console.error('Failed 7-day reminder for booking', booking.id, e)
                results.push(`FAILED 7-day for ${booking.customer_email}`)
            }
        }
    }

    // Fetch sessions tomorrow
    const { data: tomorrowBookings, error: errT } = await supabase
        .from('bookings')
        .select('*')
        .eq('session_date', tomorrowDateStr)
        .eq('reminder_day_before_sent', false)

    if (errT) {
        console.error('Day-before query error:', errT)
    } else {
        for (const booking of (tomorrowBookings || [])) {
            try {
                const emailData: BookingEmailData = {
                    sessionTitle: booking.session_title,
                    companyName: booking.company_name,
                    themeName: booking.theme_name || booking.theme_slug,
                    sessionDate: booking.session_date,
                    sessionTime: booking.session_time,
                    dynamicUrl: booking.dynamic_url,
                    customerName: booking.customer_name,
                    customerEmail: booking.customer_email,
                    customerPhone: booking.customer_phone,
                    stripePaymentIntentId: booking.stripe_payment_intent_id,
                }
                await sendDayBeforeReminder(emailData)
                await supabase
                    .from('bookings')
                    .update({ reminder_day_before_sent: true })
                    .eq('id', booking.id)
                results.push(`Day-before reminder sent to ${booking.customer_email}`)
            } catch (e) {
                console.error('Failed day-before reminder for booking', booking.id, e)
                results.push(`FAILED day-before for ${booking.customer_email}`)
            }
        }
    }

    console.log('Cron send-reminders results:', results)
    return NextResponse.json({ ok: true, results })
}
