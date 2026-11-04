-- Squeek City: players, leaderboard and cloud save.
-- Each browser signs in anonymously; a player row is keyed by auth.uid().

create schema if not exists private;

create table public.players (
  id               uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (name ~ '^[A-Za-z0-9_]{3,16}$'),
  wallet           text check (wallet is null or wallet ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  save             jsonb check (save is null or (jsonb_typeof(save) = 'object' and pg_column_size(save) <= 16384)),
  seeds            int not null default 0 check (seeds between 0 and 1000000),        -- golden seeds collected
  missions         int not null default 0 check (missions between 0 and 13),
  best_wanted_secs int not null default 0 check (best_wanted_secs between 0 and 7200),
  updated_at       timestamptz not null default now()
);

create unique index players_name_lower_key on public.players (lower(name));
create index players_seeds_idx    on public.players (seeds desc, updated_at);
create index players_missions_idx on public.players (missions desc, updated_at);
create index players_wanted_idx   on public.players (best_wanted_secs desc, updated_at);

-- Anti-cheat (basic): stamp updated_at, pin id, and rate-limit how fast scores can grow.
-- Values over the limit are clamped, not rejected, so honest offline play catches up over time.
create function private.players_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  secs numeric;
begin
  if tg_op = 'INSERT' then
    new.seeds := least(new.seeds, 300);
  else
    new.id := old.id;
    secs := greatest(0, extract(epoch from now() - old.updated_at));
    new.seeds    := least(new.seeds,    old.seeds    + 25 + floor(secs / 4)::int);   -- ~15 golden seeds / min
    new.missions := least(new.missions, old.missions + 2  + floor(secs / 60)::int);  -- ~1 mission / min
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger players_guard before insert or update on public.players
  for each row execute function private.players_guard();

-- RLS: everyone can read the leaderboard columns, only the owner can write their row.
alter table public.players enable row level security;

create policy "Leaderboard is public" on public.players
  for select to anon, authenticated using (true);
create policy "Players insert their own row" on public.players
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "Players update their own row" on public.players
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Column privileges: save and wallet are never readable through the public API.
revoke all on public.players from anon, authenticated;
grant select (id, name, seeds, missions, best_wanted_secs, updated_at) on public.players to anon, authenticated;
grant insert (name, wallet, save, seeds, missions, best_wanted_secs) on public.players to authenticated;
grant update (name, wallet, save, seeds, missions, best_wanted_secs) on public.players to authenticated;

-- Owner-only read of the full row (incl. save) via RPC: public invoker wrapper -> private definer.
create function private.my_player()
returns table (name text, wallet text, save jsonb, seeds int, missions int, best_wanted_secs int, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.name, p.wallet, p.save, p.seeds, p.missions, p.best_wanted_secs, p.updated_at
  from public.players p where p.id = (select auth.uid())
$$;
revoke all on function private.my_player() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.my_player() to authenticated;

create function public.my_player()
returns table (name text, wallet text, save jsonb, seeds int, missions int, best_wanted_secs int, updated_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from private.my_player()
$$;
revoke all on function public.my_player() from public, anon;
grant execute on function public.my_player() to authenticated;
revoke execute on function private.players_guard() from public, anon, authenticated;
