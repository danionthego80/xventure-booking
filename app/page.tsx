'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
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
  themeName: string
  themeSlug: string
  customerName: string
  customerEmail: string
  customerPhone: string
}

function generateSlug(title: string): string {
  return title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function CheckoutForm({ bookingData, onBack }: { bookingData: BookingData, onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsLoading(true)
    setErrorMessage('')
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/?success=true`,
      },
    })
    if (error) {
      setErrorMessage(error.message || 'Payment failed')
      setIsLoading(false)
    }
  }

  const sessionDate = bookingData.sessionDate
    ? new Date(bookingData.sessionDate + 'T00:00:00').toLocaleDateString('en-AU', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex justify-between">
            <span className="font-medium">Session</span>
            <span className="text-right max-w-xs">{bookingData.sessionTitle}</span>
          </div>
          {bookingData.companyName && (
            <div className="flex justify-between">
              <span className="font-medium">Company</span>
              <span>{bookingData.companyName}</span>
            </div>
          )}
          {sessionDate && (
            <div className="flex justify-between">
              <span className="font-medium">Date</span>
              <span>{sessionDate}</span>
            </div>
          )}
          {bookingData.sessionTime && (
            <div className="flex justify-between">
              <span className="font-medium">Time</span>
              <span>{bookingData.sessionTime}</span>
            </div>
          )}
          {bookingData.themeName && (
            <div className="flex justify-between">
              <span className="font-medium">Theme</span>
              <span>{bookingData.themeName}</span>
            </div>
          )}
          {bookingData.customerName && (
            <div className="flex justify-between">
              <span className="font-medium">Booked by</span>
              <span>{bookingData.customerName}</span>
            </div>
          )}
        </div>
        <div className="border-t border-blue-200 mt-4 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>AUD $990.00</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST (10%)</span>
            <span>AUD $99.00</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
            <span>Total</span>
            <span>AUD $1,089.00</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Full refund available if cancelled 30 or more days before your session date. Promotional bookings are non-refundable.
        </p>
      </div>

      <PaymentElement options={{ wallets: { link: 'never' as const } }} />

      {errorMessage && (
        <div className="text-red-600 text-sm">{errorMessage}</div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          style={{ backgroundColor: '#0F3460' }}
          className="flex-1 py-3 px-4 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Pay AUD $1,089.00'}
        </button>
      </div>
    </form>
  )
}

export default function Home() {
  const [step, setStep] = useState(1)
  const [themes, setThemes] = useState<Theme[]>([])
  const [clientSecret, setClientSecret] = useState('')
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [bookingData, setBookingData] = useState<BookingData>({
    sessionTitle: '',
    companyName: '',
    dynamicUrl: '',
    sessionDate: '',
    sessionTime: '',
    themeId: '',
    themeName: '',
    themeSlug: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
  })

  useEffect(() => {
    if (window.location.search.includes('success=true')) {
      setShowSuccess(true)
    }
    fetchThemes()
  }, [])

  useEffect(() => {
    if (bookingData.sessionTitle) {
      setBookingData(prev => ({ ...prev, dynamicUrl: generateSlug(bookingData.sessionTitle) }))
    }
  }, [bookingData.sessionTitle])

  async function fetchThemes() {
    try {
      const res = await fetch('/api/get-themes')
      const data = await res.json()
      setThemes(data.themes || [])
    } catch {
      console.error('Failed to fetch themes')
    }
  }

  async function handleStep1Next() {
    if (!bookingData.sessionTitle || !bookingData.sessionDate || !bookingData.sessionTime || !bookingData.themeId) {
      alert('Please fill in all required fields')
      return
    }
    setStep(2)
  }

  async function handleStep2Next() {
    if (!bookingData.customerName || !bookingData.customerEmail) {
      alert('Please fill in your name and email')
      return
    }
    setIsCreatingIntent(true)
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })
      const data = await res.json()
      setClientSecret(data.clientSecret)
      setStep(3)
    } catch {
      alert('Failed to initialise payment. Please try again.')
    } finally {
      setIsCreatingIntent(false)
    }
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:border-[#0F3460] placeholder-gray-400"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"

  if (showSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f5f0eb' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#0F3460' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600">Your XVenture session has been booked and created. You will receive a confirmation shortly.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f5f0eb' }}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Your XVenture Session</h1>
          <p className="text-gray-600">Complete the steps below to reserve your team experience</p>
        </div>

        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
                style={{ backgroundColor: step >= s ? '#0F3460' : '#e5e7eb', color: step >= s ? '#fff' : '#9ca3af' }}
              >
                {s}
              </div>
              {s < 3 && (
                <div className="w-12 h-1 mx-1"
                  style={{ backgroundColor: step > s ? '#0F3460' : '#e5e7eb' }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Session Details</h2>

              <div>
                <label className={labelClass}>
                  Session Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookingData.sessionTitle}
                  onChange={(e) => setBookingData(prev => ({ ...prev, sessionTitle: e.target.value }))}
                  placeholder="e.g. Acme Corp Team Building"
                  className={inputClass}
                />
              </div>

              {bookingData.dynamicUrl && (
                <div className="text-sm text-gray-500">
                  Session URL: <span className="text-gray-400">live.xvmindgames.com/</span>
                  <span className="font-mono bg-gray-100 text-gray-700 px-1 rounded">{bookingData.dynamicUrl}</span>
                </div>
              )}

              <div>
                <label className={labelClass}>Company Name</label>
                <input
                  type="text"
                  value={bookingData.companyName}
                  onChange={(e) => setBookingData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={bookingData.sessionDate}
                    onChange={(e) => setBookingData(prev => ({ ...prev, sessionDate: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={bookingData.sessionTime}
                    onChange={(e) => setBookingData(prev => ({ ...prev, sessionTime: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Theme <span className="text-red-500">*</span>
                </label>
                {themes.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading themes...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {themes.map((theme) => (
                      <div
                        key={theme.id}
                        onClick={() => setBookingData(prev => ({ ...prev, themeId: theme.id, themeName: theme.name, themeSlug: theme.slug }))}
                        className="border-2 rounded-lg p-3 cursor-pointer transition-all"
                        style={{
                          borderColor: bookingData.themeId === theme.id ? '#0F3460' : '#e5e7eb',
                          backgroundColor: bookingData.themeId === theme.id ? '#f0f4f8' : '#fff',
                        }}
                      >
                        <span className="font-medium text-gray-900">{theme.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleStep1Next}
                style={{ backgroundColor: '#0F3460' }}
                className="w-full py-3 px-4 text-white rounded-lg font-semibold"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>

              <div>
                <label className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookingData.customerName}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="e.g. Jane Smith"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={bookingData.customerEmail}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customerEmail: e.target.value }))}
                  placeholder="e.g. jane@company.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={bookingData.customerPhone}
                  onChange={(e) => setBookingData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="e.g. 0400 000 000"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  disabled={isCreatingIntent}
                  style={{ backgroundColor: '#0F3460' }}
                  className="flex-1 py-3 px-4 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isCreatingIntent ? 'Loading...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && clientSecret && (
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-gray-900">Payment</h2>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm bookingData={bookingData} onBack={() => setStep(2)} />
              </Elements>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
