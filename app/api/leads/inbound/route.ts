/**
 * POST /api/leads/inbound
 *
 * Receives QR scan lead data, stores in Supabase, fires Nia instant SMS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendNiaSMS(to: string, clientName: string, leadName: string) {
  const message =
    `Hi ${leadName}! This is ${clientName} — thanks for reaching out about our special. ` +
    `We'll be in touch shortly to get you scheduled. Questions? Just reply here!`

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
    console.error('[Nia SMS] Failed:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, phone, email, campaign_ref, qr_code,
      vehicle_year, vehicle_make, vehicle_model, service_needed,
    } = body

    if (!phone || !campaign_ref) {
      return NextResponse.json(
        { error: 'phone and campaign_ref are required' },
        { status: 400 }
      )
    }

    // 1. Store lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        name, phone, email, campaign_ref, qr_code,
        source: 'qr', vehicle_year, vehicle_make,
        vehicle_model, service_needed, status: 'new',
      })
      .select()
      .single()

    if (leadErr) {
      console.error('[leads/inbound] Supabase error:', leadErr)
      return NextResponse.json({ error: leadErr.message }, { status: 500 })
    }

    // 2. Look up client name for SMS
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('client_name')
      .eq('ref', campaign_ref)
      .maybeSingle()

    const clientName = campaign?.client_name ?? 'your local shop'

    // 3. Fire Nia instant SMS
    let niaSent = false
    if (phone) {
      const smsResult = await sendNiaSMS(phone, clientName, name ?? 'there')
      niaSent = smsResult.ok

      if (niaSent) {
        await supabase.from('riley_drips').insert({
          lead_id: lead.id,
          sequence: 'nia-instant',
          send_at: new Date().toISOString(),
          to_phone: phone,
          message: `Hi ${name ?? 'there'}! This is ${clientName} — thanks for reaching out. We'll be in touch shortly!`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
      }
    }

    // 4. Queue Riley 24h follow-up
    await supabase.from('riley_drips').insert({
      lead_id: lead.id,
      sequence: 'riley-d1-no-booking',
      send_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      to_phone: phone,
      message: `Hi ${name ?? 'there'}, just following up from ${clientName}! Still interested in our brake special? Reply YES and we'll lock in a time.`,
      status: 'pending',
    })

    // 5. Bump campaign lead count
    await supabase.rpc('increment_campaign_stat', {
      p_ref: campaign_ref,
      p_column: 'leads_count',
    })

    return NextResponse.json({ success: true, lead_id: lead.id, nia_sent: niaSent }, { status: 201 })
  } catch (err) {
    console.error('[leads/inbound] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}