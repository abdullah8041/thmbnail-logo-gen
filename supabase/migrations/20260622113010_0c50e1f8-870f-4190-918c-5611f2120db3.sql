
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bonus_granted boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET bonus_granted = true WHERE bonus_granted = false;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_exists boolean;
begin
  select exists(select 1 from public.profiles where id = new.id or lower(email) = lower(new.email)) into v_exists;

  insert into public.profiles (id, email, credits, status, bonus_granted)
  values (new.id, new.email, case when v_exists then 0 else 3 end, 'free', true)
  on conflict (id) do nothing;

  if lower(new.email) = 'mianhadirkhalil16@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_credits(_user_id uuid, _amount integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'forbidden'; end if;
  update public.profiles set credits = greatest(0, _amount) where id = _user_id;
end; $function$;
