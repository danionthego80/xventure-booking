'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Theme {
  id: string
  name: string
  slug: string
}

interface BookingData {
  sessionTitle: string
  companyName: string
  dynamicUrl: string
  sessionDate: string
  sessionTime: string
  themeId: string
  contactName: string
  contactEmail: string
  contactPhone: string
  amountCents: number
  clientSecret?: string
}

function generateSlug(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function CheckoutForm({ bookingData, onSuccess }: { bookingData: BookingData; onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsProcessing(true)
    setErrorMessage('')
    try {
      const { error: submitError } = await elements.submit()
      if (submitError) { setErrorMessage(submitError.message || 'Payment failed'); setIsProcessing(false); return }
      const res = await fetch('/api/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create session')
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/success` },
      })
      if (error) setErrorMessage(error.message || 'Payment failed')
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">{errorMessage}</div>}
      <button type="submit" disabled={!stripe || isProcessing}
        className="w-full py-4 px-6 bg-[#e94560] hover:bg-[#c73652] disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors text-lg">
        {isProcessing ? 'Processing...' : 'Pay AUD $1,089.00'}
      </button>
    </form>
  )
}

export default function BookingPage() {
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form')
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [clientSecret, setClientSecret] = useState('')
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [formError, setFormError] = useState('')
  const [formData, setFormData] = useState({
    sessionTitle: '', companyName: '', dynamicUrl: '',
    sessionDate: '', sessionTime: '09:00', themeId: '',
    contactName: '', contactEmail: '', contactPhone: '',
  })

  useEffect(() => {
    fetch('/api/get-themes').then(r => r.json()).then(data => { setThemes(data.themes || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (formData.sessionTitle) setFormData(prev => ({ ...prev, dynamicUrl: generateSlug(formData.sessionTitle) }))
  }, [formData.sessionTitle])

  useEffect(() => {
    if (!formData.dynamicUrl) { setIsSlugAvailable(null); return }
    const timer = setTimeout(async () => {
      setCheckingSlug(true)
      try {
        const res = await fetch(`/api/validate-slug?slug=${formData.dynamicUrl}`)
        const data = await res.json()
        setIsSlugAvailable(data.available)
      } catch { setIsSlugAvailable(null) }
      finally { setCheckingSlug(false) }
    }, 600)
    return () => clearTimeout(timer)
  }, [formData.dynamicUrl])

  const AMOUNT_CENTS = 108900
  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }))
  const selectedTheme = themes.find(t => t.id === formData.themeId)
  const today = new Date().toISOString().split('T')[0]

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formData.sessionTitle || !formData.companyName || !formData.sessionDate || !formData.themeId || !formData.contactEmail) {
      setFormError('Please fill in all required fields.'); return
    }
    if (isSlugAvailable === false) { setFormError('That session URL is already taken.'); return }
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: AMOUNT_CENTS }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to initialise payment')
    }
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-10 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">You&apos;re booked!</h1>
          <p className="text-gray-300">Confirmation sent to <strong>{formData.contactEmail}</strong></p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Book Your XVenture Experience</h1>
          <p className="text-gray-300 text-lg">Immersive virtual team sessions — AUD $990 + GST per session</p>
        </div>

        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/20 pb-2">Session Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Session Title <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.sessionTitle} onChange={e => update('sessionTitle', e.target.value)}
                    placeholder="e.g. Acme Corp Team Day"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#e94560]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Company Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.companyName} onChange={e => update('companyName', e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#e94560]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Session URL</label>
                  <div className="relative">
                    <input type="text" value={formData.dynamicUrl} onChange={e => update('dynamicUrl', e.target.value)}
                      className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-400 focus:outline-none pr-10 ${
                        isSlugAvailable === false ? 'border-red-500' : isSlugAvailable === true ? 'border-green-500' : 'border-white/20 focus:border-[#e94560]'}`} />
                    <div className="absolute right-3 top-3.5 text-sm">
                      {checkingSlug && <span className="text-gray-400">⏳</span>}
                      {!checkingSlug && isSlugAvailable === true && <span className="text-green-400">✓</span>}
                      {!checkingSlug && isSlugAvailable === false && <span className="text-red-400">✗</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Auto-generated from session title</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/20 pb-2">Date &amp; Time</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Date <span className="text-red-400">*</span></label>
                  <input type="date" value={formData.sessionDate} min={today} onChange={e => update('sessionDate', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#e94560]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Start Time <span className="text-red-400">*</span></label>
                  <input type="time" value={formData.sessionTime} onChange={e => update('sessionTime', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#e94560]" required />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/20 pb-2">Choose Your Theme</h2>
              {loading ? <p className="text-gray-400">Loading themes...</p> : (
                <div className="grid grid-cols-1 gap-3">
                  {themes.map(theme => (
                    <label key={theme.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.themeId === theme.id ? 'border-[#e94560] bg-[#e94560]/20' : 'border-white/20 bg-white/5 hover:border-white/40'}`}>
                      <input type="radio" name="theme" value={theme.id} checked={formData.themeId === theme.id}
                        onChange={() => update('themeId', theme.id)} className="sr-only" />
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${formData.themeId === theme.id ? 'border-[#e94560] bg-[#e94560]' : 'border-gray-400'}`} />
                      <span className="text-white font-medium">{theme.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/20 pb-2">Your Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Full Name <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.contactName} onChange={e => update('contactName', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#e94560]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Email <span className="text-red-400">*</span></label>
                  <input type="email" value={formData.contactEmail} onChange={e => update('contactEmail', e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#e94560]" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Phone</label>
                  <input type="tel" value={formData.contactPhone} onChange={e => update('contactPhone', e.target.value)}
                    placeholder="+61 400 000 000"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-[#e94560]" />
                </div>
              </div>
            </section>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex justify-between text-gray-300 mb-1"><span>Session fee</span><span>AUD $990.00</span></div>
              <div className="flex justify-between text-gray-300 mb-2"><span>GST (10%)</span><span>AUD $99.00</span></div>
              <div className="flex justify-between text-white font-bold text-lg border-t border-white/20 pt-2"><span>Total</span><span>AUD $1,089.00</span></div>
              <p className="text-xs text-gray-400 mt-2">No refunds on promotional offers. Full refund available 30+ days prior.</p>
            </div>

            {formError && <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">{formError}</div>}

            <button type="submit" className="w-full py-4 px-6 bg-[#e94560] hover:bg-[#c73652] text-white font-bold rounded-xl transition-colors text-lg">
              Continue to Payment →
            </button>
          </form>
        )}

        {step === 'payment' && clientSecret && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
            <button onClick={() => setStep('form')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">← Back</button>
            <h2 className="text-2xl font-bold text-white mb-2">Secure Payment</h2>
            <p className="text-gray-300 mb-6">{formData.sessionTitle} · {selectedTheme?.name} · {formData.sessionDate} at {formData.sessionTime}</p>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night', variables: { colorPrimary: '#e94560' } } }}>
              <CheckoutForm bookingData={{ ...formData, amountCents: AMOUNT_CENTS, clientSecret }} onSuccess={() => setStep('success')} />
            </Elements>
          </div>
        )}
      </div>
    </main>
  )
}
