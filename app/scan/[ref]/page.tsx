'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function ScanPage() {
  const params = useParams()
  const ref = Array.isArray(params.ref) ? params.ref[0] : (params.ref ?? '')

  const [step, setStep] = useState<'form' | 'success'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    service_needed: 'Brake Pad Replacement',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.phone) {
      setError('Name and phone number are required.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/leads/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          campaign_ref: ref.replace(/-route\w+$/, ''),
          qr_code: ref,
          source: 'qr',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      setStep('success')
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.checkmark}>✓</div>
          <h1 style={styles.successTitle}>You're on the list!</h1>
          <p style={styles.successText}>
            We'll text you shortly to confirm your appointment for the brake special.
            Keep an eye on your phone!
          </p>
          <p style={styles.shopInfo}>
            Questions? Call us at{' '}
            <a href="tel:4059437171" style={styles.link}>405-943-7171</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.badge}>LIMITED OFFER</div>
        <h1 style={styles.title}>Brake Pad Special</h1>
        <div style={styles.price}>$259.99</div>
        <p style={styles.subtitle}>Front AND back — parts included</p>
        <p style={styles.shopName}>Meridian Lube &amp; Auto Repair</p>
        <p style={styles.shopAddress}>4499 N.W. 50th · OKC, OK 73112</p>

        <hr style={styles.divider} />

        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.formLabel}>Claim your spot — we'll text you to confirm:</p>

          <input
            style={styles.input}
            type="text"
            placeholder="Your name *"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="tel"
            placeholder="Cell phone number *"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />

          <div style={styles.vehicleRow}>
            <input
              style={{ ...styles.input, flex: '0 0 80px' }}
              type="text"
              placeholder="Year"
              value={form.vehicle_year}
              onChange={e => set('vehicle_year', e.target.value)}
              maxLength={4}
            />
            <input
              style={{ ...styles.input, flex: '1' }}
              type="text"
              placeholder="Make (e.g. Toyota)"
              value={form.vehicle_make}
              onChange={e => set('vehicle_make', e.target.value)}
            />
            <input
              style={{ ...styles.input, flex: '1' }}
              type="text"
              placeholder="Model"
              value={form.vehicle_model}
              onChange={e => set('vehicle_model', e.target.value)}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Sending…' : 'Claim My Brake Special →'}
          </button>

          <p style={styles.disclaimer}>
            By submitting, you agree to receive a text confirmation from Meridian Lube.
            Reply STOP to opt out.
          </p>
        </form>
      </div>
    </div>
  )
}

const RED = '#c8102e'

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '32px 24px',
    maxWidth: '440px',
    width: '100%',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    background: RED,
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '4px 12px',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 900,
    color: '#111',
    margin: '0 0 4px',
  },
  price: {
    fontSize: '48px',
    fontWeight: 900,
    color: RED,
    lineHeight: '1',
    margin: '8px 0 4px',
  },
  subtitle: {
    fontSize: '15px',
    color: '#444',
    margin: '0 0 8px',
  },
  shopName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111',
    margin: '0',
  },
  shopAddress: {
    fontSize: '13px',
    color: '#666',
    margin: '2px 0 0',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #eee',
    margin: '20px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
  },
  formLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
    textAlign: 'center',
  },
  input: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  vehicleRow: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    background: RED,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '4px',
  },
  errorText: {
    color: RED,
    fontSize: '13px',
    margin: '0',
  },
  disclaimer: {
    fontSize: '11px',
    color: '#999',
    textAlign: 'center',
    margin: '0',
    lineHeight: '1.5',
  },
  checkmark: {
    width: '60px',
    height: '60px',
    background: '#dcfce7',
    color: '#15803d',
    fontSize: '28px',
    fontWeight: 700,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: 900,
    color: '#111',
    margin: '0 0 12px',
  },
  successText: {
    fontSize: '15px',
    color: '#444',
    lineHeight: '1.6',
    margin: '0 0 16px',
  },
  shopInfo: {
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: RED,
    fontWeight: 600,
  },
}