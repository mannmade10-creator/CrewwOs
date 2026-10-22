/**
 * POST /api/print/send-mailer
 * Print Agent — Lob.com integration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LOB_BASE = 'https://api.lob.com/v1'

function lobHeaders() {
  const encoded = Buffer.from(`${process.env.LOB_API_KEY}:`).toString('base64')
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  }
}

interface LobAddress {
  name: string
  address_line1: string
  address_city: string
  address_state: string
  address_zip: string
  address_country?: string
}

async function createLobMailer(
  fromAddress: LobAddress,
  toAddress: LobAddress,
  frontUrl: string,
  description: string
): Promise<{ id: string; expected_delivery_date: string } | { error: string }> {
  const res = await fetch(`${LOB_BASE}/self_mailers`, {
    method: 'POST',
    headers: lobHeaders(),
    body: JSON.stringify({
      description,
      to: toAddress,
      from: fromAddress,
      inside: '<html><body></body></html>',
      outside: frontUrl,
      size: '8.5x11_bifold',
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[Lob] Error:', data)
    return { error: data?.error?.message ?? 'Lob API error' }
  }

  return { id: data.id, expected_delivery_date: data.expected_delivery_date }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-crewwos-agent-secret')
  if (secret !== process.env.CREWWOS_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      campaign_ref, client_name, client_phone,
      client_address, brochure_pdf_url, recipients, description,
    } = body

    if (!campaign_ref || !client_name || !brochure_pdf_url || !recipients?.length) {
      return NextResponse.json(
        { error: 'campaign_ref, client_name, brochure_pdf_url, and recipients are required' },
        { status: 400 }
      )
    }

    const fromAddress: LobAddress = {
      name: client_name,
      address_line1: client_address.line1,
      address_city: client_address.city,
      address_state: client_address.state,
      address_zip: client_address.zip,
      address_country: 'US',
    }

    // 1. Upsert campaign row
    await supabase.from('campaigns').upsert(
      {
        ref: campaign_ref,
        client_name,
        client_phone,
        description: description ?? `${client_name} direct mail campaign`,
        status: 'sending',
        mailers_sent: 0,
        leads_count: 0,
        appointments_count: 0,
        revenue_cents: 0,
        cost_cents: 0,
      },
      { onConflict: 'ref' }
    )

    // 2. Fire Lob for each recipient
    const results: { to: string; lob_id?: string; error?: string }[] = []
    let successCount = 0

    for (const recipient of recipients) {
      const toAddress: LobAddress = {
        name: recipient.name ?? 'Current Resident',
        address_line1: recipient.line1,
        address_city: recipient.city,
        address_state: recipient.state,
        address_zip: recipient.zip,
        address_country: 'US',
      }

      const result = await createLobMailer(
        fromAddress,
        toAddress,
        brochure_pdf_url,
        `${campaign_ref} — ${recipient.name ?? recipient.line1}`
      )

      if ('error' in result) {
        results.push({ to: recipient.line1, error: result.error })
      } else {
        results.push({ to: recipient.line1, lob_id: result.id })
        successCount++
      }
    }

    // 3. Update campaign status
    await supabase
      .from('campaigns')
      .update({
        mailers_sent: successCount,
        status: successCount === recipients.length ? 'active' : 'partial',
        mailed_at: new Date().toISOString(),
      })
      .eq('ref', campaign_ref)

    return NextResponse.json({
      success: true,
      campaign_ref,
      total: recipients.length,
      sent: successCount,
      failed: recipients.length - successCount,
      results,
    })
  } catch (err) {
    console.error('[send-mailer] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}