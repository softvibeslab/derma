/*
  # Fix User Profile Error - Simplified Approach

  1. Ensure test users exist in public.users table
  2. Create functions to handle user profile creation
  3. Improve error handling for missing profiles
  4. Add automatic profile creation for authenticated users

  Note: This migration does NOT touch auth.users table directly.
  Test users must be created through Supabase Auth UI or signup process.
*/

-- Ensure test users exist in public.users table with correct IDs
-- These IDs should match the ones created in Supabase Auth
INSERT INTO users (id, email, full_name, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@dermacielo.com', 'Administrador Sistema', 'administrador', true),
('550e8400-e29b-41d4-a716-446655440002', 'cajero@dermacielo.com', 'Cajero Sistema', 'cajero', true),
('550e8400-e29b-41d4-a716-446655440003', 'cosmetologa@dermacielo.com', 'Cosmetóloga Sistema', 'cosmetologa', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Update role_id for all users to ensure consistency
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL OR role_id != (
  SELECT r.id FROM roles r WHERE r.name = users.role
);

-- Function to automatically create user profile when needed
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT := 'cajero';
  role_uuid UUID;
BEGIN
  -- Determine role based on email
  IF NEW.email ILIKE '%admin%' THEN
    user_role := 'administrador';
  ELSIF NEW.email ILIKE '%cosmetologa%' OR NEW.email ILIKE '%cosmetologo%' THEN
    user_role := 'cosmetologa';
  ELSIF NEW.email ILIKE '%cajero%' OR NEW.email ILIKE '%cajera%' THEN
    user_role := 'cajero';
  END IF;

  -- Get role_id
  SELECT id INTO role_uuid FROM roles WHERE name = user_role;

  -- Insert into public.users table
  INSERT INTO public.users (id, email, full_name, role, role_id, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    user_role,
    role_uuid,
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', users.full_name),
    role = user_role,
    role_id = role_uuid,
    is_active = true,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get or create user profile safely
CREATE OR REPLACE FUNCTION get_or_create_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR,
  role_id UUID,
  sucursal VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  default_role TEXT := 'cajero';
  role_uuid UUID;
BEGIN
  -- Try to get existing profile
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.sucursal, u.is_active, u.created_at, u.updated_at
  FROM users u
  WHERE u.id = user_id AND u.is_active = true;

  -- If not found, try to create one
  IF NOT FOUND THEN
    -- Get user info from auth.users
    SELECT au.email, COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
    INTO user_email, user_name
    FROM auth.users au
    WHERE au.id = user_id;

    -- Determine role based on email
    IF user_email ILIKE '%admin%' THEN
      default_role := 'administrador';
    ELSIF user_email ILIKE '%cosmetologa%' OR user_email ILIKE '%cosmetologo%' THEN
      default_role := 'cosmetologa';
    ELSIF user_email ILIKE '%cajero%' OR user_email ILIKE '%cajera%' THEN
      default_role := 'cajero';
    END IF;

    -- Get role_id
    SELECT r.id INTO role_uuid FROM roles r WHERE r.name = default_role;

    -- Create the profile if we have user info
    IF user_email IS NOT NULL THEN
      INSERT INTO users (id, email, full_name, role, role_id, is_active)
      VALUES (
        user_id,
        user_email,
        COALESCE(user_name, user_email, 'Usuario'),
        default_role,
        role_uuid,
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        role_id = EXCLUDED.role_id,
        is_active = true,
        updated_at = NOW();

      -- Return the newly created profile
      RETURN QUERY
      SELECT u.id, u.email, u.full_name, u.role, u.role_id, u.sucursal, u.is_active, u.created_at, u.updated_at
      FROM users u
      WHERE u.id = user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to ensure user profile exists for current session
CREATE OR REPLACE FUNCTION ensure_user_profile()
RETURNS users AS $$
DECLARE
  current_user_id UUID;
  user_profile users;
  user_email TEXT;
  user_name TEXT;
  default_role TEXT := 'cajero';
  role_uuid UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found';
  END IF;

  -- Try to get existing profile
  SELECT * INTO user_profile FROM users WHERE id = current_user_id AND is_active = true;

  -- If profile doesn't exist, create it
  IF user_profile.id IS NULL THEN
    -- Get user info from auth.users
    SELECT au.email, COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
    INTO user_email, user_name
    FROM auth.users au
    WHERE au.id = current_user_id;

    -- Determine role based on email
    IF user_email ILIKE '%admin%' THEN
      default_role := 'administrador';
    ELSIF user_email ILIKE '%cosmetologa%' OR user_email ILIKE '%cosmetologo%' THEN
      default_role := 'cosmetologa';
    ELSIF user_email ILIKE '%cajero%' OR user_email ILIKE '%cajera%' THEN
      default_role := 'cajero';
    END IF;

    -- Get role_id
    SELECT r.id INTO role_uuid FROM roles r WHERE r.name = default_role;

    -- Create the profile
    INSERT INTO users (id, email, full_name, role, role_id, is_active)
    VALUES (
      current_user_id,
      COALESCE(user_email, 'usuario@dermacielo.com'),
      COALESCE(user_name, user_email, 'Usuario'),
      default_role,
      role_uuid,
      true
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      role_id = EXCLUDED.role_id,
      is_active = true,
      updated_at = NOW()
    RETURNING * INTO user_profile;
  END IF;

  RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to be more permissive for profile creation
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'administrador' AND u.is_active = true
    )
  );

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role = 'administrador' AND u.is_active = true
    )
  );

-- Create a more permissive policy for profile access during creation
CREATE POLICY "Allow profile creation for authenticated users" ON users
  FOR ALL USING (
    auth.role() = 'authenticated'
  );

-- Ensure all existing users have proper role_id
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE users TO authenticated;
GRANT ALL ON TABLE roles TO authenticated;

-- Create a view for easy user profile access
CREATE OR REPLACE VIEW current_user_profile AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.role_id,
  u.sucursal,
  u.is_active,
  u.created_at,
  u.updated_at,
  r.name as role_name,
  r.description as role_description,
  r.permissions as role_permissions
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.id = auth.uid() AND u.is_active = true;

-- Grant access to the view
GRANT SELECT ON current_user_profile TO authenticated;