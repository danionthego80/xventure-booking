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

            <PaymentElement />

            {errorMessage && (
                <div className="text-red-600 text-sm">{errorMessage}</div>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                    &lt;- Back
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !stripe}
                    style={{ backgroundColor: '#0F3460' }}
                    className="flex-1 py-3 px-4 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                >
                    {isLoading ? 'Processing...' : 'Pay AUD $1,089.00'}
                </button>
            </div>
        </form>
    )
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
            const res = await fetch('/api/themes')
            const data = await res.json()
            setThemes(data)
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

    if (showSuccess) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f8f4f0' }}>
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#0F3460' }}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                    <p className="text-gray-600">
                        Your XVenture session has been booked and created. You will receive a confirmation shortly.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen p-4 md:p-8" style={{ backgroundColor: '#f8f4f0' }}>
            <div className="max-w-lg mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Book Your XVenture Session</h1>
                    <p className="text-gray-500 mt-2">Complete the steps below to reserve your team experience</p>
                </div>

                <div className="flex items-center justify-center mb-8 gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                                style={{
                                    backgroundColor: step >= s ? '#0F3460' : '#e5e7eb',
                                    color: step >= s ? 'white' : '#6b7280',
                                }}
                            >
                                {s}
                            </div>
                            {s < 3 && (
                                <div
                                    className="w-12 h-1 mx-1"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Session Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bookingData.sessionTitle}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, sessionTitle: e.target.value }))}
                                    placeholder="e.g. Acme Corp Team Building"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2"
                                    style={{ '--tw-ring-color': '#0F3460' } as React.CSSProperties}
                                    onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    value={bookingData.companyName}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, companyName: e.target.value }))}
                                    placeholder="e.g. Acme Corp"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                    onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            {bookingData.dynamicUrl && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Session URL
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">live.xvmindgames.com/</span>
                                        <span className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">{bookingData.dynamicUrl}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={bookingData.sessionDate}
                                        onChange={(e) => setBookingData(prev => ({ ...prev, sessionDate: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                        onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Time <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={bookingData.sessionTime}
                                        onChange={(e) => setBookingData(prev => ({ ...prev, sessionTime: e.target.value }))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                        onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Theme <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {themes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            type="button"
                                            onClick={() => setBookingData(prev => ({
                                                ...prev,
                                                themeId: theme.id,
                                                themeName: theme.name,
                                                themeSlug: theme.slug,
                                            }))}
                                            className="p-3 rounded-lg border text-sm font-medium text-left transition-all"
                                            style={{
                                                borderColor: bookingData.themeId === theme.id ? '#0F3460' : '#e5e7eb',
                                                backgroundColor: bookingData.themeId === theme.id ? '#fff5f0' : 'white',
                                                color: bookingData.themeId === theme.id ? '#0F3460' : '#374151',
                                            }}
                                        >
                                            {theme.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleStep1Next}
                                style={{ backgroundColor: '#0F3460' }}
                                className="w-full py-3 text-white rounded-lg font-semibold hover:opacity-90"
                            >
                                Continue -&gt;
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bookingData.customerName}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, customerName: e.target.value }))}
                                    placeholder="Your full name"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                    onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={bookingData.customerEmail}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, customerEmail: e.target.value }))}
                                    placeholder="you@example.com"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                    onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={bookingData.customerPhone}
                                    onChange={(e) => setBookingData(prev => ({ ...prev, customerPhone: e.target.value }))}
                                    placeholder="+61 4XX XXX XXX"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
                                    onFocus={(e) => e.target.style.borderColor = '#0F3460'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    &lt;- Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStep2Next}
                                    disabled={isCreatingIntent}
                                    style={{ backgroundColor: '#0F3460' }}
                                    className="flex-1 py-3 px-4 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                                >
                                    {isCreatingIntent ? 'Loading...' : 'Continue ->'}
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
