
-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view their own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
create policy "Admins can view all roles" on public.user_roles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can manage roles" on public.user_roles
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credits integer not null default 3,
  status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Users view own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Admins view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile (limited)" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins update all profiles" on public.profiles
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + grant admin role on signup if email matches
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, credits, status)
  values (new.id, new.email, 3, 'free')
  on conflict (id) do nothing;

  if lower(new.email) = 'mianhadirkhalil16@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Credit consumption RPC
create or replace function public.consume_credit()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_status text;
  v_credits integer;
begin
  select status, credits into v_status, v_credits
  from public.profiles where id = auth.uid() for update;

  if v_status is null then
    raise exception 'no_profile';
  end if;

  if v_status = 'premium' then
    return 999999;
  end if;

  if v_credits <= 0 then
    return -1;
  end if;

  update public.profiles set credits = credits - 1 where id = auth.uid();
  return v_credits - 1;
end;
$$;
grant execute on function public.consume_credit() to authenticated;

-- Admin actions
create or replace function public.admin_add_credits(_user_id uuid, _amount integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  update public.profiles set credits = greatest(0, credits + _amount) where id = _user_id;
end; $$;
grant execute on function public.admin_add_credits(uuid, integer) to authenticated;

create or replace function public.admin_set_status(_user_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  if _status not in ('free', 'premium') then raise exception 'bad_status'; end if;
  update public.profiles set status = _status where id = _user_id;
end; $$;
grant execute on function public.admin_set_status(uuid, text) to authenticated;

-- Backfill any existing users
insert into public.profiles (id, email, credits, status)
select id, email, 3, 'free' from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, case when lower(email) = 'mianhadirkhalil16@gmail.com' then 'admin'::app_role else 'user'::app_role end
from auth.users
on conflict do nothing;
