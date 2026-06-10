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

function generateSlug(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function CheckoutForm({
  clientSecret,
  bookingData,
}: {
  clientSecret: string
  bookingData: Record<string, string>
}) {
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
      if (submitError) {
        setErrorMessage(submitError.message || 'Payment failed')
        setIsProcessing(false)
        return
      }
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/?success=true`,
        },
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
      {errorMessage && (
        <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {errorMessage}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-4 px-6 bg-[#e94560] hover:bg-[#c73652] disabled:bg-gray-600 text-white font-bold rounded-xl transition-colors text-lg"
      >
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
    sessionTitle: '',
    companyName: '',
    dynamicUrl: '',
    sessionDate: '',
    sessionTime: '09:00',
    themeId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  })

  // Check for success redirect from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setStep('success')
    }
  }, [])

  useEffect(() => {
    fetch('/api/get-themes')
      .then(r => r.json())
      .then(data => { setThemes(data.themes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (formData.sessionTitle) {
      setFormData(prev => ({ ...prev, dynamicUrl: generateSlug(formData.sessionTitle) }))
    }
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!formData.sessionTitle || !formData.companyName || !formData.sessionDate ||
        !formData.themeId || !formData.contactName || !formData.contactEmail) {
      setFormError('Please fill in all required fields')
      return
    }
    if (!isSlugAvailable) {
      setFormError('Please wait for URL validation or choose a unique session title')
      return
    }
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionTitle: formData.sessionTitle,
          companyName: formData.companyName,
          dynamicUrl: formData.dynamicUrl,
          sessionDate: formData.sessionDate,
          startTime: formData.sessionTime,
          themeId: formData.themeId,
          customerName: formData.contactName,
          customerEmail: formData.contactEmail,
          customerPhone: formData.contactPhone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create payment')
      setClientSecret(data.clientSecret)
      setStep('payment')
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const selectedTheme = themes.find(t => t.id === formData.themeId)

  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-white">Booking Confirmed!</h1>
          <p className="text-gray-300">
            Your XVenture session has been created. You'll receive a confirmation email shortly.
          </p>
          <button
            onClick={() => { setStep('form'); window.history.replaceState({}, '', '/') }}
            className="mt-4 px-6 py-3 bg-[#e94560] text-white rounded-xl font-semibold hover:bg-[#c73652] transition-colors"
          >
            Book Another Session
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Book Your XVenture Experience</h1>
          <p className="text-gray-400">Immersive virtual team sessions — AUD $990 + GST per session</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
          {step === 'payment' && clientSecret ? (
            <div className="space-y-6">
              <button
                onClick={() => setStep('form')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">Secure Payment</h2>
                <p className="text-gray-400 mt-1">
                  {formData.sessionTitle} · {selectedTheme?.name} · {formData.sessionDate} at {formData.sessionTime}
                </p>
              </div>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'night', variables: { colorPrimary: '#e94560' } },
                }}
              >
                <CheckoutForm
                  clientSecret={clientSecret}
                  bookingData={{
                    sessionTitle: formData.sessionTitle,
                    companyName: formData.companyName,
                    dynamicUrl: formData.dynamicUrl,
                    sessionDate: formData.sessionDate,
                    startTime: formData.sessionTime,
                    themeId: formData.themeId,
                    customerName: formData.contactName,
                    customerEmail: formData.contactEmail,
                    customerPhone: formData.contactPhone,
                  }}
                />
              </Elements>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white border-b border-white/20 pb-3">Session Details</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Session Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sessionTitle}
                      onChange={e => setFormData(prev => ({ ...prev, sessionTitle: e.target.value }))}
                      placeholder="e.g. Acme Corp Team Day"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Company Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Session URL</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.dynamicUrl}
                        onChange={e => setFormData(prev => ({ ...prev, dynamicUrl: e.target.value }))}
                        className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white placeholder-gray-500 focus:outline-none ${
                          isSlugAvailable === true ? 'border-green-500' : isSlugAvailable === false ? 'border-red-500' : 'border-white/20 focus:border-[#e94560]'
                        }`}
                      />
                      {checkingSlug && <span className="absolute right-3 top-3 text-gray-400 text-sm">⏳</span>}
                      {!checkingSlug && isSlugAvailable === true && <span className="absolute right-3 top-3 text-green-400">✓</span>}
                      {!checkingSlug && isSlugAvailable === false && <span className="absolute right-3 top-3 text-red-400">✗</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-generated from session title</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white border-b border-white/20 pb-3">Date & Time</h2>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.sessionDate}
                      onChange={e => setFormData(prev => ({ ...prev, sessionDate: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Start Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="time"
                      value={formData.sessionTime}
                      onChange={e => setFormData(prev => ({ ...prev, sessionTime: e.target.value }))}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white border-b border-white/20 pb-3">Choose Your Theme</h2>
                <div className="mt-4 space-y-2">
                  {loading ? (
                    <p className="text-gray-400">Loading themes...</p>
                  ) : (
                    themes.map(theme => (
<div
                          key={theme.id}
                          onClick={() => setFormData(prev => ({ ...prev, themeId: theme.id }))}
                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                                                      formData.themeId === theme.id
                                                        ? 'border-[#e94560] bg-[#e94560]/10'
                                                        : 'border-white/20 hover:border-white/40'
                          }`}
                        >
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                                    formData.themeId === theme.id
                                                      ? 'border-[#e94560] bg-[#e94560]'
                                                      : 'border-white/40'
                        }`} />
                        <span className="text-white font-medium">{theme.name}</span>
</div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-white border-b border-white/20 pb-3">Your Details</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={e => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      placeholder="jane@company.com"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={e => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="+61 400 000 000"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e94560]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Session fee</span><span>AUD $990.00</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>GST (10%)</span><span>AUD $99.00</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg border-t border-white/20 pt-2">
                  <span>Total</span><span>AUD $1,089.00</span>
                </div>
                <p className="text-xs text-gray-500">No refunds on promotional offers. Full refund available 30+ days prior.</p>
              </div>

              {formError && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">{formError}</div>
              )}

              <button
                type="submit"
                className="w-full py-4 px-6 bg-[#e94560] hover:bg-[#c73652] text-white font-bold rounded-xl transition-colors text-lg"
              >
                Continue to Payment →
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
