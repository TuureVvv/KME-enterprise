begin;
create table if not exists kme_private.push_config(singleton boolean primary key default true check(singleton),public_key text,private_key text,scheduler_token text not null default encode(extensions.gen_random_bytes(32),'hex'));
insert into kme_private.push_config(singleton)values(true)on conflict do nothing;
create table if not exists kme_private.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,session_id uuid not null,profile_id uuid not null references public.kme_profiles(id)on delete cascade,endpoint text not null unique,keys jsonb not null,prefs jsonb not null default '{"chat":true,"checkins":false,"timer":true,"reminder":false,"time":"19:00"}',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),last_reminder date,timer_at timestamptz);
create index if not exists push_device on kme_private.push_subscriptions(user_id);
create index if not exists push_profile on kme_private.push_subscriptions(profile_id);
create table if not exists kme_private.push_queue(id uuid primary key default gen_random_uuid(),subscription_id uuid not null references kme_private.push_subscriptions(id)on delete cascade,source text not null,kind text not null check(kind in('chat','checkins','timer','reminder','test')),due_at timestamptz not null default now(),status text not null default 'pending' check(status in('pending','sending','sent','failed')),attempts integer not null default 0,lease_until timestamptz,lease_token uuid,created_at timestamptz not null default now(),unique(subscription_id,source));
create index if not exists push_due on kme_private.push_queue(due_at)where status in('pending','sending');
alter table kme_private.push_config enable row level security;alter table kme_private.push_subscriptions enable row level security;alter table kme_private.push_queue enable row level security;
revoke all on kme_private.push_config,kme_private.push_subscriptions,kme_private.push_queue from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

