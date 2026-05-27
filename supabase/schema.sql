create table if not exists clothing_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  image_url text not null,
  category text not null check (category in ('top', 'bottom', 'outer', 'shoes', 'accessory')),
  name text not null,
  colors text[] not null default '{}',
  style_tags text[] not null default '{}',
  season text[] not null default '{}',
  formality int not null default 3 check (formality between 1 and 5),
  confidence numeric not null default 0.7 check (confidence between 0 and 1),
  manually_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recognition_results (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  image_url text not null,
  raw_output jsonb not null default '{}',
  confidence numeric not null default 0.7 check (confidence between 0 and 1),
  status text not null check (status in ('auto_accepted', 'needs_review', 'failed')),
  final_item_id uuid references clothing_items(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists outfit_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  occasion text not null,
  selected_items uuid[] not null default '{}',
  reason text not null,
  style text not null,
  color_logic text not null,
  user_action text not null default 'pending' check (user_action in ('pending', 'accepted', 'rejected')),
  rank int not null,
  model_used text not null,
  created_at timestamptz not null default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists clothing_items_user_id_idx on clothing_items(user_id);
create index if not exists recognition_results_user_id_idx on recognition_results(user_id);
create index if not exists outfit_candidates_user_id_idx on outfit_candidates(user_id);
create index if not exists usage_events_user_id_idx on usage_events(user_id);
