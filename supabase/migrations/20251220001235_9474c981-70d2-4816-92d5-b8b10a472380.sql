-- Update handle_new_user() to add input validation for username and full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  safe_username TEXT;
  safe_full_name TEXT;
BEGIN
  -- Validate and sanitize username
  safe_username := COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email);
  
  -- Ensure username is reasonable length (max 100 characters)
  IF LENGTH(safe_username) > 100 THEN
    safe_username := LEFT(safe_username, 100);
  END IF;
  
  -- Ensure username is not empty
  IF safe_username IS NULL OR LENGTH(TRIM(safe_username)) = 0 THEN
    safe_username := NEW.email;
  END IF;
  
  -- Trim username
  safe_username := TRIM(safe_username);
  
  -- Validate full_name if provided
  safe_full_name := NEW.raw_user_meta_data ->> 'full_name';
  IF safe_full_name IS NOT NULL THEN
    -- Ensure full_name is reasonable length (max 100 characters)
    IF LENGTH(safe_full_name) > 100 THEN
      safe_full_name := LEFT(safe_full_name, 100);
    END IF;
    -- Trim full_name
    safe_full_name := TRIM(safe_full_name);
    -- Set to NULL if empty after trim
    IF LENGTH(safe_full_name) = 0 THEN
      safe_full_name := NULL;
    END IF;
  END IF;
  
  INSERT INTO public.profiles (user_id, username, full_name)
  VALUES (NEW.id, safe_username, safe_full_name);
  
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column() to use SECURITY INVOKER since it doesn't need elevated privileges
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;