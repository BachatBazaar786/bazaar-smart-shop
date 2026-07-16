CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS user_roles_super_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_super_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_super_admin_delete ON public.user_roles;
DROP POLICY IF EXISTS user_roles_super_admin_all ON public.user_roles;
DROP POLICY IF EXISTS user_roles_read_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_self_read ON public.user_roles;

CREATE POLICY user_roles_read_own
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);