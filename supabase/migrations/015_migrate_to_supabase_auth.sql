-- Migration 015: Migrate to Supabase Auth
-- Удалить хранение plaintext паролей и использовать только auth.users

-- 1. Удалить поле password из public.users
ALTER TABLE public.users DROP COLUMN IF EXISTS password;

-- 2. Добавить FK constraint для связи с auth.users
-- (обеспечит каскадное удаление при удалении auth-пользователя)
ALTER TABLE public.users
ADD CONSTRAINT fk_users_auth_users
FOREIGN KEY (id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 3. Удалить старую функцию register_user (с параметром p_password)
DROP FUNCTION IF EXISTS public.register_user(uuid, text, text, text, jsonb, text);

-- 4. Создать новую функцию register_user БЕЗ параметра p_password
CREATE OR REPLACE FUNCTION public.register_user(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_role_code text,
  p_allowed_pages jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DECLARE
    v_is_first_user BOOLEAN;
    v_access_status access_status_type;
  BEGIN
    -- Проверка первого пользователя
    SELECT NOT EXISTS (SELECT 1 FROM public.users LIMIT 1) INTO v_is_first_user;

    -- Первый admin/director/developer → auto-approved
    IF v_is_first_user AND p_role_code IN ('administrator', 'director', 'developer') THEN
      v_access_status := 'approved';

      INSERT INTO public.users (
        id, full_name, email, role_code, access_status, allowed_pages,
        approved_by, approved_at
      ) VALUES (
        p_user_id, p_full_name, p_email, p_role_code, v_access_status, p_allowed_pages,
        p_user_id, NOW()
      );
    ELSE
      -- Остальные → pending (ждут одобрения)
      v_access_status := 'pending';

      INSERT INTO public.users (
        id, full_name, email, role_code, access_status, allowed_pages
      ) VALUES (
        p_user_id, p_full_name, p_email, p_role_code, v_access_status, p_allowed_pages
      );
    END IF;
  END;
$function$;
