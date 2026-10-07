-- Pace schema. Every row belongs to one user; row-level security limits access to its owner.
-- IDs are generated on the device so the app can work offline and sync later.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  income numeric(14, 2) not null default 0,
  payday smallint not null default 1 check (payday between 1 and 28),
  tracking_methods text[] not null default '{}',
  rules jsonb not null default '{}'::jsonb,
  reminders jsonb not null default '{"daily": false, "bills": false, "hour": 21}'::jsonb,
  setup_dismissed boolean not null default false,
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.pockets (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  icon text not null,
  tint text not null,
  budget numeric(14, 2) not null default 0,
  fixed boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  merchant text not null,
  amount numeric(14, 2) not null,
  date timestamptz not null,
  pocket_id text,
  note text,
  goal_id text,
  needs_review boolean not null default false,
  source text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index transactions_user_date on public.transactions (user_id, date desc);

create table public.goals (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  target numeric(14, 2) not null,
  monthly numeric(14, 2) not null default 0,
  auto_save boolean not null default false,
  last_auto_save text,
  target_date timestamptz not null,
  icon text not null,
  tint text not null,
  art text,
  flag text,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.contributions (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  goal_id text not null,
  label text not null,
  amount numeric(14, 2) not null,
  date timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index contributions_user_goal on public.contributions (user_id, goal_id);

create table public.bills (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  amount numeric(14, 2) not null,
  due_date timestamptz not null,
  recurring boolean not null default true,
  icon text not null,
  tint text not null,
  pocket_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Keep updated_at current on every write.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'pockets', 'transactions', 'goals', 'contributions', 'bills'] loop
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner can do everything" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- In-app account deletion (required by the App Store). Cascades to every table above.
create function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
