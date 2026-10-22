/**
 * POST /api/artist/onboard
 *
 * Flexible upsert — accepts the full form payload from the onboarding wizard.
 * The frontend sends onboarding_step (next step) and onboarding_complete.
 * No per-step validation; every field is optional so the user can skip freely
 * and come back later.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── GET — fetch current profile ───────────────────────────────────────────────

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('artist_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

// ── POST — save wizard progress ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Clamp onboarding_step to 1–6 regardless of what the client sends
    const rawStep = Number(body.onboarding_step)
    const onboarding_step = Math.min(Math.max(isNaN(rawStep) ? 1 : rawStep, 1), 6)
    const onboarding_complete = body.onboarding_complete === true

    // Build the profile upsert payload — only include fields that are present
    const profilePayload: Record<string, unknown> = {
      user_id: userId,
      onboarding_step,
      onboarding_complete,
    }

    const textFields = [
      'stage_name', 'legal_name', 'genre', 'bio', 'photo_url',
      'distrokid_artist_id', 'spotify_artist_url', 'apple_artist_url',
      'instagram_handle', 'tiktok_handle', 'twitter_handle', 'youtube_channel',
      'phone_number', 'qr_link',
    ]
    for (const f of textFields) {
      if (body[f] !== undefined) profilePayload[f] = body[f] || null
    }

    const boolFields = ['bmi_registered', 'ascap_registered', 'soundexchange_registered']
    for (const f of boolFields) {
      if (body[f] !== undefined) profilePayload[f] = Boolean(body[f])
    }

    const { data: profile, error: profileErr } = await supabase
      .from('artist_profiles')
      .upsert(profilePayload, { onConflict: 'user_id' })
      .select()
      .single()

    if (profileErr) {
      console.error('[artist/onboard] profile upsert error:', profileErr)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // Optionally save a track if provided (step 5)
    let track = null
    if (body.track && body.track.title) {
      const { data: existingProfile } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (existingProfile?.id) {
        const trackPayload = {
          artist_id: existingProfile.id,
          title: body.track.title,
          type: body.track.type ?? 'single',
          release_date: body.track.release_date ?? null,
          spotify_url: body.track.spotify_url ?? null,
          distributed: body.track.distributed ?? false,
        }

        const { data: trackData } = await supabase
          .from('artist_tracks')
          .upsert(trackPayload, { onConflict: 'artist_id,title' })
          .select()
          .single()

        track = trackData
      }
    }

    return NextResponse.json({ profile, track }, { status: 200 })
  } catch (err) {
    console.error('[artist/onboard]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
