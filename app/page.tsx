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

function generateSlug(title: string): string {
    return title.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
}

function CheckoutForm({
    clientSecret,
    formData,
    themes,
    onBack,
}: {
    clientSecret: string
    formData: any
    themes: Theme[]
    onBack: () => void
}) {
    const stripe = useStripe()
    const elements = useElements()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

  const selectedTheme = themes.find(t => t.id === formData.themeId)

  const formatDateTime = () => {
        if (!formData.date || !formData.startTime) return ''
        const [year, month, day] = formData.date.split('-')
        const date = new Date(Number(year), Number(month) - 1, Number(day))
        const dateStr = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        const [hours, minutes] = formData.startTime.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${dateStr} at ${h12}:${minutes} ${ampm}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!stripe || !elements) return
        setLoading(true)
        setError('')
        const { error: submitError } = await elements.submit()
        if (submitError) {
                setError(submitError.message || 'Payment failed')
                setLoading(false)
                return
        }
        const { error: confirmError } = await stripe.confirmPayment({
                elements,
                confirmParams: { return_url: `${window.location.origin}/?success=true` },
        })
        if (confirmError) {
                setError(confirmError.message || 'Payment failed')
                setLoading(false)
        }
  }

  return (
        <form onSubmit={handleSubmit}>
          {/* Back button */}
                <button
                          type="button"
                          onClick={onBack}
                          className="mb-6 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                        <- Back
                </button>button>
        
              <h2 className="text-xl font-semibold text-white mb-1">Secure Payment</h2>h2>
              <p className="text-sm text-gray-400 mb-6">
                {formData.sessionTitle} · {selectedTheme?.name} · {formData.date ? `${formData.date.split('-').reverse().join('/')}` : ''} at {formData.startTime}
              </p>p>
        
          {/* Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Order Summary</h3>h3>
                      <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                            <span className="text-gray-400">Session</span>span>
                                            <span className="text-white font-medium">{formData.sessionTitle}</span>span>
                                </div>div>
                                <div className="flex justify-between">
                                            <span className="text-gray-400">Company</span>span>
                                            <span className="text-white">{formData.companyName}</span>span>
                                </div>div>
                                <div className="flex justify-between">
                                            <span className="text-gray-400">Date & Time</span>span>
                                            <span className="text-white text-right max-w-[60%]">{formatDateTime()}</span>span>
                                </div>div>
                                <div className="flex justify-between">
                                            <span className="text-gray-400">Theme</span>span>
                                            <span className="text-white">{selectedTheme?.name}</span>span>
                                </div>div>
                                <div className="flex justify-between">
                                            <span className="text-gray-400">Booked by</span>span>
                                            <span className="text-white">{formData.fullName}</span>span>
                                </div>div>
                      </div>div>
                      <div className="border-t border-white/10 mt-4 pt-4 space-y-2 text-sm">
                                <div className="flex justify-between text-gray-400">
                                            <span>Session fee</span>span>
                                            <span>AUD $990.00</span>span>
                                </div>div>
                                <div className="flex justify-between text-gray-400">
                                            <span>GST (10%)</span>span>
                                            <span>AUD $99.00</span>span>
                                </div>div>
                                <div className="flex justify-between text-white font-semibold text-base pt-1">
                                            <span>Total</span>span>
                                            <span>AUD $1,089.00</span>span>
                                </div>div>
                      </div>div>
                      <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                                Full refund available if cancelled 30 or more days before your session date. Promotional bookings are non-refundable.
                      </p>p>
              </div>div>
        
          {/* Stripe Payment Element */}
              <PaymentElement />
        
          {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>div>
              )}
        
              <button
                        type="submit"
                        disabled={!stripe || loading}
                        className="mt-6 w-full py-4 bg-[#E8521A] hover:bg-[#d4481a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
                      >
                {loading ? 'Processing...' : 'Pay AUD $1,089.00'}
              </button>button>
        </form>form>
      )
}

export default function Home() {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
        const isSuccess = searchParams?.get('success') === 'true'
          
            const [themes, setThemes] = useState<Theme[]>([])
                const [formData, setFormData] = useState({
                      sessionTitle: '',
                      companyName: '',
                      dynamicUrl: '',
                      date: '',
                      startTime: '09:00',
                      themeId: '',
                      fullName: '',
                      email: '',
                      phone: '',
                })
                    const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
                        const [showPayment, setShowPayment] = useState(false)
                            const [clientSecret, setClientSecret] = useState('')
                                const [submitError, setSubmitError] = useState('')
                                  
                                    useEffect(() => {
                                          fetch('/api/get-themes')
                                                  .then(r => r.json())
                                                  .then(data => setThemes(data.themes || []))
                                                  .catch(() => {})
                                    }, [])
                                      
                                        const handleTitleChange = (value: string) => {
                                              const slug = generateSlug(value)
                                                    setFormData(prev => ({ ...prev, sessionTitle: value, dynamicUrl: slug }))
                                                          setSlugStatus('idle')
                                        }
                                          
                                            const handleSlugBlur = async () => {
                                                  if (!formData.dynamicUrl) return
                                                        setSlugStatus('checking')
                                                              try {
                                                                      const res = await fetch(`/api/validate-slug?slug=${formData.dynamicUrl}`)
                                                                              const data = await res.json()
                                                                                      setSlugStatus(data.available ? 'available' : 'taken')
                                                              } catch {
                                                                      setSlugStatus('idle')
                                                              }
                                            }
                                              
                                                const handleContinue = async () => {
                                                      setSubmitError('')
                                                            try {
                                                                    const res = await fetch('/api/create-payment-intent', {
                                                                              method: 'POST',
                                                                              headers: { 'Content-Type': 'application/json' },
                                                                              body: JSON.stringify(formData),
                                                                    })
                                                                            const data = await res.json()
                                                                                    if (!data.clientSecret) throw new Error('No client secret returned')
                                                                                            setClientSecret(data.clientSecret)
                                                                                                    setShowPayment(true)
                                                              } catch (err) {
                                                                    setSubmitError('Failed to initialise payment. Please try again.')
                                                            }
                                                }
                                                  
                                                    const isFormValid = () => {
                                                          return (
                                                                  formData.sessionTitle.trim() &&
                                                                  formData.companyName.trim() &&
                                                                  formData.date &&
                                                                  formData.startTime &&
                                                                  formData.themeId &&
                                                                  formData.fullName.trim() &&
                                                                  formData.email.trim() &&
                                                                  slugStatus === 'available'
                                                                )
                                                    }
                                                      
                                                        if (isSuccess) {
                                                              const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
                                                                    return (
                                                                            <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
                                                                                    <div className="w-full max-w-lg bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                                                                                              <div className="w-16 h-16 bg-[#E8521A]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                                                                          <svg className="w-8 h-8 text-[#E8521A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                                                            </svg>svg>
                                                                                                </div>div>
                                                                                              <h1 className="text-2xl font-bold text-white mb-3">Booking Confirmed!</h1>h1>
                                                                                              <p className="text-gray-400 mb-6">
                                                                                                          Your XVenture session has been booked and is being set up. You will receive a confirmation email shortly.
                                                                                                </p>p>
                                                                                              <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-400">
                                                                                                          Payment ID: {params?.get('payment_intent') || 'N/A'}
                                                                                                </div>div>
                                                                                    </div>div>
                                                                            </main>main>
                                                                          )
                                                                      }
                                                                      
                                                                        return (
                                                                              <main className="min-h-screen bg-[#0f172a] py-12 px-4">
                                                                                    <div className="w-full max-w-lg mx-auto">
                                                                                            <div className="text-center mb-10">
                                                                                                      <h1 className="text-3xl font-bold text-white mb-2">Book Your XVenture Experience</h1>h1>
                                                                                                      <p className="text-gray-400">Immersive virtual team sessions — AUD $990 + GST per session</p>p>
                                                                                              </div>div>
                                                                                    
                                                                                            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                                                                                              {showPayment && clientSecret ? (
                                                                                            <Elements
                                                                                                            stripe={stripePromise}
                                                                                                            options={{
                                                                                                                              clientSecret,
                                                                                                                              appearance: {
                                                                                                                                                  theme: 'night',
                                                                                                                                                  variables: { colorPrimary: '#E8521A', borderRadius: '8px' },
                                                                                                                                },
                                                                                                              }}
                                                                                                          >
                                                                                                          <CheckoutForm
                                                                                                                            clientSecret={clientSecret}
                                                                                                                            formData={formData}
                                                                                                                            themes={themes}
                                                                                                                            onBack={() => setShowPayment(false)}
                                                                                                                          />
                                                                                              </Elements>Elements>
                                                                                          ) : (
                                                                                            <>
                                                                                              {/* Session Details */}
                                                                                                          <div className="mb-8">
                                                                                                                          <h2 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Session Details</h2>h2>
                                                                                                          
                                                                                                                          <div className="space-y-4">
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Session Title <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="text"
                                                                                                                                                                                        value={formData.sessionTitle}
                                                                                                                                                                                        onChange={e => handleTitleChange(e.target.value)}
                                                                                                                                                                                        placeholder="e.g. Acme Corp Team Day"
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                          
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Company Name <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="text"
                                                                                                                                                                                        value={formData.companyName}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                                                                                                                                                                        placeholder="e.g. Acme Corp"
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                          
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Session URL</label>label>
                                                                                                                                                                <div className="relative">
                                                                                                                                                                                      <input
                                                                                                                                                                                                                type="text"
                                                                                                                                                                                                                value={formData.dynamicUrl}
                                                                                                                                                                                                                onBlur={handleSlugBlur}
                                                                                                                                                                                                                onChange={e => {
                                                                                                                                                                                                                                            setFormData(prev => ({ ...prev, dynamicUrl: e.target.value }))
                                                                                                                                                                                                                                                                        setSlugStatus('idle')
                                                                                                                                                                                                                                                                                                  }}
                                                                                                                                                                                                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none transition-colors pr-10 ${
                                                                                                                                                                                                                                            slugStatus === 'available' ? 'border-green-500/50 focus:border-green-500/70' :
                                                                                                                                                                                                                                            slugStatus === 'taken' ? 'border-red-500/50 focus:border-red-500/70' :
                                                                                                                                                                                                                                            'border-white/10 focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30'
                                                                                                                                                                                                                                          }`}
                                                                                                                                                                                                              />
                                                                                                                                                                                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                                                                                                                                                              {slugStatus === 'checking' && <span className="text-gray-400 text-xs">checking...</span>span>}
                                                                                                                                                                                                              {slugStatus === 'available' && <span className="text-green-400 text-lg">✓</span>span>}
                                                                                                                                                                                                              {slugStatus === 'taken' && <span className="text-red-400 text-xs">taken</span>span>}
                                                                                                                                                                                                            </div>div>
                                                                                                                                                                  </div>div>
                                                                                                                                                                <p className="text-xs text-gray-500 mt-1">Auto-generated from session title</p>p>
                                                                                                                                              </div>div>
                                                                                                                            </div>div>
                                                                                                            </div>div>
                                                                                            
                                                                                              {/* Date & Time */}
                                                                                                          <div className="mb-8">
                                                                                                                          <h2 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Date & Time</h2>h2>
                                                                                                                          <div className="grid grid-cols-2 gap-4">
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Date <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="date"
                                                                                                                                                                                        value={formData.date}
                                                                                                                                                                                        min={new Date().toISOString().split('T')[0]}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Start Time <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="time"
                                                                                                                                                                                        value={formData.startTime}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                            </div>div>
                                                                                                            </div>div>
                                                                                            
                                                                                              {/* Theme */}
                                                                                                          <div className="mb-8">
                                                                                                                          <h2 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Choose Your Theme</h2>h2>
                                                                                                                          <div className="space-y-2">
                                                                                                                            {themes.map(theme => (
                                                                                                                  <div
                                                                                                                                          key={theme.id}
                                                                                                                                          onClick={() => setFormData(prev => ({ ...prev, themeId: theme.id }))}
                                                                                                                                          className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                                                                                                                                                    formData.themeId === theme.id
                                                                                                                                                                      ? 'border-[#E8521A]/60 bg-[#E8521A]/10'
                                                                                                                                                                      : 'border-white/10 bg-white/5 hover:border-white/20'
                                                                                                                                            }`}
                                                                                                                                        >
                                                                                                                                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                                                                                                                                                  formData.themeId === theme.id ? 'border-[#E8521A] bg-[#E8521A]' : 'border-gray-500'
                                                                                                                                          }`} />
                                                                                                                                        <span className="text-white text-sm font-medium">{theme.name}</span>span>
                                                                                                                    </div>div>
                                                                                                                ))}
                                                                                                                            </div>div>
                                                                                                            </div>div>
                                                                                            
                                                                                              {/* Your Details */}
                                                                                                          <div className="mb-8">
                                                                                                                          <h2 className="text-lg font-semibold text-white mb-5 pb-3 border-b border-white/10">Your Details</h2>h2>
                                                                                                                          <div className="space-y-4">
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Full Name <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="text"
                                                                                                                                                                                        value={formData.fullName}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                                                                                                                                                                        placeholder="Jane Smith"
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                                                                                                                                                                      Email <span className="text-[#E8521A]">*</span>span>
                                                                                                                                                                  </label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="email"
                                                                                                                                                                                        value={formData.email}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                                                                                                                                                        placeholder="jane@company.com"
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>div>
                                                                                                                                            <div>
                                                                                                                                                                <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone</label>label>
                                                                                                                                                                <input
                                                                                                                                                                                        type="tel"
                                                                                                                                                                                        value={formData.phone}
                                                                                                                                                                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                                                                                                                                                        placeholder="+61 400 000 000"
                                                                                                                                                                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#E8521A]/50 focus:ring-1 focus:ring-[#E8521A]/30 transition-colors"
                                                                                                                                                                                      />
                                                                                                                                              </div>
                                                                                                                            </div>
                                                                                                            </div>
                                                                                            
                                                                                              {submitError && (
                                                                                                              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                                                                                                {submitError}
                                                                                                                </div>
                                                                                                          )}
                                                                                            
                                                                                                          <button
                                                                                                                            onClick={handleContinue}
                                                                                                                            disabled={!isFormValid()}
                                                                                                                            className="w-full py-4 bg-[#E8521A] hover:bg-[#d4481a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-base"
                                                                                                                          >
                                                                                                                          Continue to Payment ->
                                                                                                            </button>
                                                                                              </>>
                                                                                          )}
                                                                                              </div>
                                                                                    </div>
                                                                              </main>
                                                                            )
                                                                          }</></button>
