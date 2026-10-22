-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 — Artist Vertical
-- Tables: artist_profiles, artist_tracks, artist_socials, artist_campaigns,
--         artist_submissions, artist_royalties, artist_fan_leads
-- Run AFTER 003_campaigns.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Artist Profiles ──────────────────────────────────────────────────────────
create table if not exists public.artist_profiles (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             text        not null unique,          -- Clerk user_id
  stage_name          text        not null,
  legal_name          text,
  genre               text        not null,
  subgenre            text,
  bio                 text,
  photo_url           text,
  cover_url           text,
  city                text,
  state               text,
  country             text        not null default 'US',

  -- Business registrations
  bmi_registered      boolean     not null default false,
  ascap_registered    boolean     not null default false,
  soundexchange_registered boolean not null default false,
  sync_licensed       boolean     not null default false,
  distrokid_artist_id text,

  -- EPK
  epk_url             text,
  epk_generated_at    timestamptz,

  -- Onboarding state
  onboarding_step     integer     not null default 1,
  onboarding_complete boolean     not null default false,

  -- Subscription
  plan                text        not null default 'starter',  -- starter | pro | label
  stripe_customer_id  text,
  stripe_sub_id       text,

  status              text        not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger artist_profiles_updated_at
  before update on public.artist_profiles
  for each row execute procedure public.set_updated_at();

create index if not exists artist_profiles_user_idx  on public.artist_profiles (user_id);
create index if not exists artist_profiles_genre_idx on public.artist_profiles (genre);

alter table public.artist_profiles enable row level security;
create policy "Service role full access" on public.artist_profiles
  for all using (true) with check (true);

-- ── Artist Tracks ─────────────────────────────────────────────────────────────
create table if not exists public.artist_tracks (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artist_profiles(id) on delete cascade,
  title           text        not null,
  type            text        not null default 'single',  -- single | album | ep | mixtape
  file_url        text,                                   -- Supabase storage
  cover_url       text,
  spotify_url     text,
  apple_url       text,
  youtube_url     text,
  tidal_url       text,
  duration_secs   integer,
  release_date    date,
  isrc            text,
  upc             text,
  distributed     boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger artist_tracks_updated_at
  before update on public.artist_tracks
  for each row execute procedure public.set_updated_at();

create index if not exists artist_tracks_artist_idx on public.artist_tracks (artist_id);

alter table public.artist_tracks enable row level security;
create policy "Service role full access" on public.artist_tracks
  for all using (true) with check (true);

-- ── Artist Socials ────────────────────────────────────────────────────────────
create table if not exists public.artist_socials (
  id          uuid    primary key default gen_random_uuid(),
  artist_id   uuid    not null references public.artist_profiles(id) on delete cascade,
  platform    text    not null,   -- tiktok | instagram | youtube | x | spotify | soundcloud
  handle      text,
  url         text,
  followers   integer,
  synced_at   timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists artist_socials_artist_idx on public.artist_socials (artist_id);

alter table public.artist_socials enable row level security;
create policy "Service role full access" on public.artist_socials
  for all using (true) with check (true);

-- ── Artist Submissions (Groover / SubmitHub) ──────────────────────────────────
create table if not exists public.artist_submissions (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artist_profiles(id) on delete cascade,
  track_id        uuid        references public.artist_tracks(id),
  platform        text        not null,   -- groover | submithub
  submission_id   text,                   -- external ID from API
  target_type     text        not null,   -- radio | playlist | blog | ar | label | sync
  target_name     text,
  target_email    text,
  status          text        not null default 'pending',  -- pending | sent | opened | responded | passed | interested
  response_notes  text,
  credits_used    integer     not null default 0,
  submitted_at    timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger artist_submissions_updated_at
  before update on public.artist_submissions
  for each row execute procedure public.set_updated_at();

create index if not exists artist_submissions_artist_idx on public.artist_submissions (artist_id);
create index if not exists artist_submissions_status_idx on public.artist_submissions (status);

alter table public.artist_submissions enable row level security;
create policy "Service role full access" on public.artist_submissions
  for all using (true) with check (true);

-- ── Artist Royalties ──────────────────────────────────────────────────────────
create table if not exists public.artist_royalties (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artist_profiles(id) on delete cascade,
  track_id        uuid        references public.artist_tracks(id),
  source          text        not null,   -- bmi | ascap | soundexchange | distrokid | sync
  period_start    date,
  period_end      date,
  amount_cents    integer     not null default 0,
  status          text        not null default 'pending',  -- pending | paid
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists artist_royalties_artist_idx on public.artist_royalties (artist_id);

alter table public.artist_royalties enable row level security;
create policy "Service role full access" on public.artist_royalties
  for all using (true) with check (true);

-- ── Artist Fan Leads (QR / show capture) ──────────────────────────────────────
create table if not exists public.artist_fan_leads (
  id          uuid        primary key default gen_random_uuid(),
  artist_id   uuid        not null references public.artist_profiles(id) on delete cascade,
  name        text,
  phone       text,
  email       text,
  source      text        not null default 'qr',   -- qr | link | show | merch
  qr_ref      text,
  city        text,
  nia_sent    boolean     not null default false,
  status      text        not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger artist_fan_leads_updated_at
  before update on public.artist_fan_leads
  for each row execute procedure public.set_updated_at();

create index if not exists artist_fan_leads_artist_idx on public.artist_fan_leads (artist_id);

alter table public.artist_fan_leads enable row level security;
create policy "Service role full access" on public.artist_fan_leads
  for all using (true) with check (true);

-- ── Artist Promo Content ──────────────────────────────────────────────────────
create table if not exists public.artist_promo (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.artist_profiles(id) on delete cascade,
  track_id        uuid        references public.artist_tracks(id),
  type            text        not null,   -- video | image | reel | short | story
  platform        text        not null,   -- tiktok | instagram | youtube | x | billboard
  asset_url       text,
  higgsfield_job  text,                   -- Higgsfield job ID
  caption         text,
  scheduled_at    timestamptz,
  posted_at       timestamptz,
  status          text        not null default 'pending',  -- pending | generating | ready | posted | failed
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger artist_promo_updated_at
  before update on public.artist_promo
  for each row execute procedure public.set_updated_at();

create index if not exists artist_promo_artist_idx  on public.artist_promo (artist_id);
create index if not exists artist_promo_status_idx  on public.artist_promo (status);

alter table public.artist_promo enable row level security;
create policy "Service role full access" on public.artist_promo
  for all using (true) with check (true);