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

const ADMIN_EMAIL = 'dani@xventure.com.au'

function formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

async function sendMail(to: string, subject: string, html: string) {
    const domain = process.env.MAILGUN_DOMAIN || ''
    const apiKey = process.env.MAILGUN_API_KEY || ''
    const from = process.env.MAILGUN_FROM || ('bookings@' + domain)

    const body = new URLSearchParams()
    body.append('from', from)
    body.append('to', to)
    body.append('subject', subject)
    body.append('html', html)

    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from('api:' + apiKey).toString('base64'),
        },
        body,
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Mailgun error ${res.status}: ${text}`)
    }
    return res.json()
}

function card(content: string): string {
    return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px">
<div style="background:#1a2744;padding:24px;border-radius:8px 8px 0 0;text-align:center">
<h1 style="color:white;margin:0;font-size:24px">XVenture</h1>
</div>
<div style="background:white;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e0e0e0">
${content}
</div>
<p style="text-align:center;color:#999;font-size:12px;margin-top:16px">XVenture Mind Games</p>
</div>`
}

export async function sendCustomerConfirmation(data: BookingEmailData) {
    const html = card(`
<h2 style="color:#1a2744;margin-top:0">Your XVenture Session is Confirmed!</h2>
<p>Hi ${data.customerName},</p>
<p>Your booking is confirmed. Here are your session details:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666;width:40%">Session</td><td style="padding:10px 0;font-weight:bold">${data.sessionTitle}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Company</td><td style="padding:10px 0">${data.companyName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Theme</td><td style="padding:10px 0">${data.themeName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Date</td><td style="padding:10px 0">${formatDate(data.sessionDate)}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Time</td><td style="padding:10px 0">${data.sessionTime}</td></tr>
<tr><td style="padding:10px 0;color:#666">Amount Paid</td><td style="padding:10px 0;font-weight:bold">AUD $1,089.00 incl. GST</td></tr>
</table>
<p style="background:#f9f9f9;border-left:4px solid #1a2744;padding:16px;border-radius:4px;font-size:14px;color:#555">
<strong>Refund Policy:</strong> Full refund available if cancelled 30 or more days before your session date. Promotional bookings are non-refundable.
</p>
<p>You will receive further details closer to your session date.</p>
<p>Questions? Email <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
<p><strong>The XVenture Team</strong></p>
`)
    return sendMail(data.customerEmail, 'Your XVenture Session is Confirmed!', html)
}

export async function sendAdminNotification(data: BookingEmailData) {
    const html = card(`
<h2 style="color:#1a2744;margin-top:0">New XVenture Booking</h2>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666;width:40%">Session Title</td><td style="padding:8px 0;font-weight:bold">${data.sessionTitle}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Company</td><td style="padding:8px 0">${data.companyName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Theme</td><td style="padding:8px 0">${data.themeName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0">${formatDate(data.sessionDate)}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Time</td><td style="padding:8px 0">${data.sessionTime}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Dynamic URL</td><td style="padding:8px 0;font-family:monospace">${data.dynamicUrl}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Customer Name</td><td style="padding:8px 0">${data.customerName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Customer Email</td><td style="padding:8px 0">${data.customerEmail}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Customer Phone</td><td style="padding:8px 0">${data.customerPhone || 'Not provided'}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:8px 0;color:#666">Stripe Payment ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${data.stripePaymentIntentId || 'N/A'}</td></tr>
<tr><td style="padding:8px 0;color:#666">Amount</td><td style="padding:8px 0;font-weight:bold">AUD $1,089.00</td></tr>
</table>
<p style="font-size:13px;color:#888">
Host URL: https://live.xvmindgames.com/host/${data.dynamicUrl}<br>
Scoring URL: https://live.xvmindgames.com/scoring/${data.dynamicUrl}<br>
Virtual World URL: https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}
</p>
`)
    return sendMail(ADMIN_EMAIL, 'New XVenture Booking -- ' + data.sessionTitle, html)
}

export async function sendSevenDayReminder(data: BookingEmailData) {
    const html = card(`
<h2 style="color:#1a2744;margin-top:0">Your XVenture Session is in 7 Days!</h2>
<p>Hi ${data.customerName},</p>
<p>Your XVenture session is coming up in <strong>7 days</strong>!</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666;width:40%">Session</td><td style="padding:10px 0;font-weight:bold">${data.sessionTitle}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Theme</td><td style="padding:10px 0">${data.themeName}</td></tr>
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666">Date</td><td style="padding:10px 0">${formatDate(data.sessionDate)}</td></tr>
<tr><td style="padding:10px 0;color:#666">Time</td><td style="padding:10px 0">${data.sessionTime}</td></tr>
</table>
<p>You will receive your access links the day before. Questions? Email <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
<p><strong>The XVenture Team</strong></p>
`)
    return sendMail(data.customerEmail, 'Your XVenture Session is in 7 Days!', html)
}

export async function sendDayBeforeReminder(data: BookingEmailData) {
    const html = card(`
<h2 style="color:#1a2744;margin-top:0">Your XVenture Session is Tomorrow!</h2>
<p>Hi ${data.customerName},</p>
<p>Your XVenture session is <strong>tomorrow</strong>! Here are your access links:</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr style="border-bottom:1px solid #eee"><td style="padding:10px 0;color:#666;width:40%">Date</td><td style="padding:10px 0;font-weight:bold">${formatDate(data.sessionDate)}</td></tr>
<tr><td style="padding:10px 0;color:#666">Time</td><td style="padding:10px 0;font-weight:bold">${data.sessionTime}</td></tr>
</table>
<div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0">
<h3 style="margin-top:0;color:#1a2744">Your Access Links</h3>
<p><strong>Host URL:</strong><br><a href="https://live.xvmindgames.com/host/${data.dynamicUrl}">https://live.xvmindgames.com/host/${data.dynamicUrl}</a></p>
<p><strong>Scoring URL:</strong><br><a href="https://live.xvmindgames.com/scoring/${data.dynamicUrl}">https://live.xvmindgames.com/scoring/${data.dynamicUrl}</a></p>
<p><strong>Virtual World URL:</strong><br><a href="https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}">https://live.xvmindgames.com/virtual-world/${data.dynamicUrl}</a></p>
</div>
<p>Questions? Email <a href="mailto:${ADMIN_EMAIL}">${ADMIN_EMAIL}</a></p>
<p>Enjoy your session!</p>
<p><strong>The XVenture Team</strong></p>
`)
    return sendMail(data.customerEmail, 'Your XVenture Session is Tomorrow!', html)
}
