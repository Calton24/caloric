-- Food Cache Table
-- Stores normalized food entries from USDA, Open Food Facts, and Edamam
-- so repeat lookups hit local DB instead of external APIs.
-- Keyed by (source, source_id) for deduplication.

create table if not exists public.food_cache (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,        -- 'usda' | 'openfoodfacts' | 'edamam'
  source_id     text not null,        -- FDC ID, OFF barcode, Edamam food ID
  name          text not null,
  brand         text,
  calories      real not null,
  protein       real not null,
  carbs         real not null,
  fat           real not null,
  fiber         real,
  sugar         real,
  sodium        real,
  serving_size  real not null default 100,
  serving_unit  text not null default 'g',
  serving_desc  text,
  match_score   real,                 -- original match relevance
  query         text not null,        -- the search query that found this
  hit_count     integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Composite unique: one row per (source, source_id)
  unique (source, source_id)
);

-- Index for fast query lookups (most common path)
create index if not exists idx_food_cache_query
  on public.food_cache using gin (to_tsvector('english', query));

-- Index for exact query match (fastest path)
create index if not exists idx_food_cache_query_lower
  on public.food_cache (lower(query));

-- Index for source-based lookups
create index if not exists idx_food_cache_source
  on public.food_cache (source, source_id);

-- Updated-at trigger
create or replace function public.update_food_cache_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists food_cache_updated_at on public.food_cache;
create trigger food_cache_updated_at
  before update on public.food_cache
  for each row
  execute function public.update_food_cache_updated_at();

-- RLS: food cache is public read, authenticated write
alter table public.food_cache enable row level security;

create policy "Anyone can read food cache"
  on public.food_cache for select
  using (true);

create policy "Authenticated users can insert food cache"
  on public.food_cache for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update food cache"
  on public.food_cache for update
  to authenticated
  using (true);
