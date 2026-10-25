begin;
create table if not exists kme_private.noticeboard(singleton boolean primary key default true check(singleton),title text not null default 'The collective thought.' check(char_length(title) between 1 and 100),body text not null default '' check(char_length(body)<=12000),revision bigint not null default 0,updated_at timestamptz not null default now(),profile_id uuid references public.kme_profiles(id) on delete set null);
insert into kme_private.noticeboard(singleton,body) values(true,coalesce((select body from kme_private.daily_note order by day desc,updated_at desc limit 1),'')) on conflict do nothing;

alter table kme_private.noticeboard enable row level security;
revoke all on kme_private.noticeboard from public,anon,authenticated;
commit;
