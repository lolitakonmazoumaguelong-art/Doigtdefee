// Mises à niveau de la base en ligne, appliquées automatiquement au démarrage.
// Chaque instruction doit pouvoir être relancée sans risque (IF NOT EXISTS).
// La base locale, elle, est créée à partir du dossier drizzle/.
export const UPGRADES = [
  `alter table documents add column if not exists paid_at timestamptz`,
  `create table if not exists contracts (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    client_id uuid not null references clients(id) on delete cascade,
    title text not null,
    start_date date not null,
    end_date date,
    interval_months integer not null default 6,
    next_visit date,
    price integer not null default 0,
    notes text not null default '',
    status text not null default 'actif',
    created_at timestamptz not null default now()
  )`,
  `create index if not exists contracts_org_idx on contracts (org_id)`,
  `alter table contracts enable row level security`,
  `create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    org_id uuid not null references orgs(id) on delete cascade,
    document_id uuid not null references documents(id) on delete cascade,
    amount integer not null,
    paid_on date not null,
    method text not null default 'cash',
    note text not null default '',
    created_at timestamptz not null default now()
  )`,
  `create index if not exists payments_document_idx on payments (document_id)`,
  `alter table payments enable row level security`,
  `create table if not exists password_resets (
    id text primary key,
    user_id uuid not null references users(id) on delete cascade,
    expires_at timestamptz not null
  )`,
  `alter table password_resets enable row level security`,
  `create table if not exists login_attempts (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists login_attempts_email_idx on login_attempts (email, created_at)`,
  `alter table login_attempts enable row level security`,
];
