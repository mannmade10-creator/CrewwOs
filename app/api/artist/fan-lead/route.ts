/**
 * POST /api/artist/fan-lead
 *
 * Public endpoint — no auth required (QR scan from a show floor).
 * Captures a fan lead, stores in artist_fan_leads, fires Nia instant SMS.
 *
 * Body:
 *   artist_id   uuid      (required) — artist's profile ID
 *   phone       string    (required) — fan's phone in any US format
 *   name        string    (optional)
 *   email       string    (optional)
 *   source      string    (optional) qr | link | show | merch  (default: qr)
 *   qr_ref      string    (optional) — campaign slug on the QR code
 *   city        string    (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── helpers ───────────────────────────────────────────────────────────────────

/** Normalise any US phone to E.164 (+1XXXXXXXXXX) */
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

async function sendNiaSMS(to: string, artistName: string, fanName: string) {
  const message =
    `Hey ${fanName}! 🎶 You're officially on the crew. ` +
    `${artistName} appreciates the love — stay tuned for exclusive drops, show announcements, and more. Reply STOP to opt out.`

  const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: process.env.BREVO_SMS_SENDER ?? 'CrewwOS',
      recipient: to,
      content: message,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[artist/fan-lead] Nia SMS failed:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { artist_id, phone, name, email, source = 'qr', qr_ref, city } = body

    if (!artist_id || !phone) {
      return NextResponse.json(
        { error: 'artist_id and phone are required' },
        { status: 400 }
      )
    }

    // Normalise phone
    const e164 = toE164(phone)
    if (!e164) {
      return NextResponse.json(
        { error: 'Invalid phone number — use a 10-digit US number' },
        { status: 400 }
      )
    }

    // Look up artist stage name for the SMS
    const { data: artist } = await supabase
      .from('artist_profiles')
      .select('stage_name')
      .eq('id', artist_id)
      .maybeSingle()

    const artistName = artist?.stage_name ?? 'Your artist'

    // Store the fan lead
    const { data: lead, error: leadErr } = await supabase
      .from('artist_fan_leads')
      .insert({
        artist_id,
        name: name ?? null,
        phone: e164,
        email: email ?? null,
        source,
        qr_ref: qr_ref ?? null,
        city: city ?? null,
        status: 'new',
      })
      .select()
      .single()

    if (leadErr) {
      console.error('[artist/fan-lead] Supabase error:', leadErr)
      return NextResponse.json({ error: leadErr.message }, { status: 500 })
    }

    // Fire Nia instant SMS
    let niaSent = false
    const smsResult = await sendNiaSMS(e164, artistName, name ?? 'Fan')
    niaSent = smsResult.ok

    // Update nia_sent flag
    if (niaSent) {
      await supabase
        .from('artist_fan_leads')
        .update({ nia_sent: true })
        .eq('id', lead.id)
    }

    return NextResponse.json(
      { success: true, lead_id: lead.id, nia_sent: niaSent },
      { status: 201 }
    )
  } catch (err) {
    console.error('[artist/fan-lead] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}