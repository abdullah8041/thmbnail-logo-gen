
-- 1) PROFILES: prevent users from updating sensitive columns (credits/status/bonus_granted/email/id).
--    Admin RPCs (SECURITY DEFINER) remain the only path to change credits/status.
DROP POLICY IF EXISTS "Users update own profile (limited)" ON public.profiles;

-- Also revoke column-level UPDATE privileges from authenticated as belt-and-suspenders,
-- so even if a future policy is added, sensitive columns stay immutable to end users.
REVOKE UPDATE ON public.profiles FROM authenticated;
-- (admin updates go through SECURITY DEFINER functions which run as owner / service_role)

-- 2) USER_ROLES: add an explicit RESTRICTIVE policy so only admins can write,
--    regardless of any future PERMISSIVE policy that might be added.
DROP POLICY IF EXISTS "Only admins can write roles" ON public.user_roles;
CREATE POLICY "Only admins can write roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) SECURITY DEFINER functions: revoke EXECUTE from PUBLIC/anon, keep only where needed.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.consume_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_credit() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_set_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_status(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_add_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_credits(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_reset_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_credits(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- handle_new_user is invoked by the auth trigger as the table owner; no client EXECUTE needed.

-- 4) Fix mutable search_path on touch_updated_at.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
