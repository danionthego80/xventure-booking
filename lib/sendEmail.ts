import FormData from 'form-data'
import Mailgun from 'mailgun.js'

const mailgun = new Mailgun(FormData)
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY || '',
})
const DOMAIN = process.env.MAILGUN_DOMAIN || ''
const FROM = process.env.MAILGUN_FROM || ('bookings@' + DOMAIN)
const ADMIN_EMAIL = 'dani@xventure.com.au'

export interface BookingEmailData {
    sessionTitle: string
    companyName: string
    themeName: string
    sessionDate: string
    sessionTime: string
    dynamicUrl: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    stripePaymentIntentId?: string
    xventureSessionId?: string
    amountPaid?: number
}

function formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function baseStyle(): string {
    return `
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background: #f5f5f5;
        padding: 20px;
    `
}

function card(content: string): string {
    return `
<div style="${baseStyle()}">
    <div style="background: #1a2744; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">XVenture</h1>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
        ${content}
    </div>
    <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">
        XVenture Mind Games &mdash; <a href="https://xventure.com.au" style="color: #999;">xventure.com.au</a>
    </p>
</div>`
}

export async function sendCustomerConfirmation(data: BookingEmailData) {
    const html = card(`
        <h2 style="color: #1a2744; margin-top: 0;">Your XVenture Session is Confirmed!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your booking is confirmed. Here are your session details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666; width: 40%;">Session</td>
                <td style="padding: 10px 0; font-weight: bold;">${data.sessionTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Company</td>
                <td style="padding: 10px 0;">${data.companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Theme</td>
                <td style="padding: 10px 0;">${data.themeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Date</td>
                <td style="padding: 10px 0;">${formatDate(data.sessionDate)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Time</td>
                <td style="padding: 10px 0;">${data.sessionTime}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666;">Amount Paid</td>
                <td style="padding: 10px 0; font-weight: bold;">AUD $1,089.00 incl. GST</td>
            </tr>
        </table>
        <div style="background: #f9f9f9; border-left: 4px solid #1a2744; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
                <strong>Refund Policy:</strong> Full refund available if cancelled 30 or more days before your session date. Promotional bookings are non-refundable.
            </p>
        </div>
        <p>You will receive further details, including access links, closer to your session date.</p>
        <p>If you have any questions, please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #1a2744;">${ADMIN_EMAIL}</a></p>
        <p>We look forward to seeing you!</p>
        <p><strong>The XVenture Team</strong></p>
    `)

    return mg.messages.create(DOMAIN, {
        from: FROM,
        to: [data.customerEmail],
        subject: 'Your XVenture Session is Confirmed!',
        html,
    })
}

export async function sendAdminNotification(data: BookingEmailData) {
    const html = card(`
        <h2 style="color: #1a2744; margin-top: 0;">New XVenture Booking</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666; width: 40%;">Session Title</td>
                <td style="padding: 8px 0; font-weight: bold;">${data.sessionTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Company</td>
                <td style="padding: 8px 0;">${data.companyName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Theme</td>
                <td style="padding: 8px 0;">${data.themeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Date</td>
                <td style="padding: 8px 0;">${formatDate(data.sessionDate)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Time</td>
                <td style="padding: 8px 0;">${data.sessionTime}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Dynamic URL</td>
                <td style="padding: 8px 0; font-family: monospace;">${data.dynamicUrl}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Customer Name</td>
                <td style="padding: 8px 0;">${data.customerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Customer Email</td>
                <td style="padding: 8px 0;">${data.customerEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Customer Phone</td>
                <td style="padding: 8px 0;">${data.customerPhone || 'Not provided'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0; color: #666;">Stripe Payment ID</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${data.stripePaymentIntentId || 'N/A'}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #666;">Amount</td>
                <td style="padding: 8px 0; font-weight: bold;">AUD $1,089.00</td>
            </tr>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #888;">
            Host URL: https://live.xvmindgames.com/host/${data.dynamicUrl}<br>
            Scoring URL: https://live.xvmindgames.com/scoring/${data.dynamicUrl}<br>
            Virtual World URL: https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}
        </p>
    `)

    return mg.messages.create(DOMAIN, {
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `New XVenture Booking -- ${data.sessionTitle}`,
        html,
    })
}

export async function sendSevenDayReminder(data: BookingEmailData) {
    const html = card(`
        <h2 style="color: #1a2744; margin-top: 0;">Your XVenture Session is in 7 Days!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Just a friendly reminder that your XVenture session is coming up in <strong>7 days</strong>!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666; width: 40%;">Session</td>
                <td style="padding: 10px 0; font-weight: bold;">${data.sessionTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Theme</td>
                <td style="padding: 10px 0;">${data.themeName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666;">Date</td>
                <td style="padding: 10px 0;">${formatDate(data.sessionDate)}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666;">Time</td>
                <td style="padding: 10px 0;">${data.sessionTime}</td>
            </tr>
        </table>
        <p>You will receive your access links the day before your session. If you have any questions, please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #1a2744;">${ADMIN_EMAIL}</a></p>
        <p><strong>The XVenture Team</strong></p>
    `)

    return mg.messages.create(DOMAIN, {
        from: FROM,
        to: [data.customerEmail],
        subject: 'Your XVenture Session is in 7 Days!',
        html,
    })
}

export async function sendDayBeforeReminder(data: BookingEmailData) {
    const html = card(`
        <h2 style="color: #1a2744; margin-top: 0;">Your XVenture Session is Tomorrow!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your XVenture session is <strong>tomorrow</strong>! Here are your access links:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px 0; color: #666; width: 40%;">Date</td>
                <td style="padding: 10px 0; font-weight: bold;">${formatDate(data.sessionDate)}</td>
            </tr>
            <tr>
                <td style="padding: 10px 0; color: #666;">Time</td>
                <td style="padding: 10px 0; font-weight: bold;">${data.sessionTime}</td>
            </tr>
        </table>
        <div style="background: #f0f4ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1a2744;">Your Access Links</h3>
            <p style="margin-bottom: 8px;"><strong>Host URL (for session host):</strong><br>
            <a href="https://live.xvmindgames.com/host/${data.dynamicUrl}" style="color: #1a2744;">https://live.xvmindgames.com/host/${data.dynamicUrl}</a></p>
            <p style="margin-bottom: 8px;"><strong>Scoring URL:</strong><br>
            <a href="https://live.xvmindgames.com/scoring/${data.dynamicUrl}" style="color: #1a2744;">https://live.xvmindgames.com/scoring/${data.dynamicUrl}</a></p>
            <p style="margin-bottom: 0;"><strong>Virtual World URL (for participants):</strong><br>
            <a href="https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}" style="color: #1a2744;">https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}</a></p>
        </div>
        <p>If you need any assistance, please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #1a2744;">${ADMIN_EMAIL}</a></p>
        <p>Enjoy your session!</p>
        <p><strong>The XVenture Team</strong></p>
    `)

    return mg.messages.create(DOMAIN, {
        from: FROM,
        to: [data.customerEmail],
        subject: 'Your XVenture Session is Tomorrow!',
        html,
    })
}
