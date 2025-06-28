/*
  # Arreglar sistema de roles y permisos

  1. Problemas identificados
    - Los usuarios no tienen role_id asignado correctamente
    - Las políticas RLS están fallando
    - El sistema de permisos no está funcionando

  2. Soluciones
    - Actualizar usuarios existentes con role_id correcto
    - Simplificar las políticas RLS
    - Arreglar la función has_permission
    - Crear políticas más simples y funcionales
*/

-- Primero, asegurar que todos los usuarios tengan role_id
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL;

-- Crear función simplificada para verificar permisos
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, module_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  module_permissions JSONB;
BEGIN
  -- Obtener rol del usuario
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.id = user_id AND u.is_active = true;

  -- Si no hay usuario o no está activo, denegar acceso
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Si es administrador, permitir todo
  IF user_role = 'administrador' THEN
    RETURN TRUE;
  END IF;

  -- Obtener permisos del rol
  SELECT r.permissions INTO user_permissions
  FROM roles r
  WHERE r.name = user_role;

  -- Si no hay permisos definidos, usar permisos por defecto
  IF user_permissions IS NULL THEN
    -- Permisos por defecto para cajero
    IF user_role = 'cajero' THEN
      user_permissions := '{
        "dashboard": ["read"],
        "patients": ["read", "create", "update"],
        "appointments": ["read", "create", "update"],
        "services": ["read"],
        "payments": ["read", "create"],
        "reports": ["read"],
        "import": ["read", "create"]
      }'::jsonb;
    -- Permisos por defecto para cosmetologa
    ELSIF user_role = 'cosmetologa' THEN
      user_permissions := '{
        "dashboard": ["read"],
        "patients": ["read", "update"],
        "appointments": ["read", "update"],
        "services": ["read"],
        "payments": ["read"],
        "reports": ["read"]
      }'::jsonb;
    ELSE
      RETURN FALSE;
    END IF;
  END IF;

  -- Si tiene permisos de administrador completo
  IF user_permissions->>'all' = 'true' THEN
    RETURN TRUE;
  END IF;

  -- Verificar permisos específicos del módulo
  module_permissions := user_permissions->module_name;
  
  IF module_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar si la acción está permitida
  RETURN module_permissions ? action_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas existentes problemáticas y crear nuevas más simples
DROP POLICY IF EXISTS "Users with patient permissions can view" ON patients;
DROP POLICY IF EXISTS "Users with patient permissions can insert" ON patients;
DROP POLICY IF EXISTS "Users with patient permissions can update" ON patients;

-- Políticas simplificadas para pacientes
CREATE POLICY "Users with patient permissions can view" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

CREATE POLICY "Users with patient permissions can insert" ON patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero')
    )
  );

CREATE POLICY "Users with patient permissions can update" ON patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

-- Políticas simplificadas para citas
DROP POLICY IF EXISTS "Users with appointment permissions can view" ON appointments;
DROP POLICY IF EXISTS "Users with appointment permissions can insert" ON appointments;
DROP POLICY IF EXISTS "Users with appointment permissions can update" ON appointments;

CREATE POLICY "Users with appointment permissions can view" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

CREATE POLICY "Users with appointment permissions can insert" ON appointments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero')
    )
  );

CREATE POLICY "Users with appointment permissions can update" ON appointments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

-- Políticas simplificadas para pagos
DROP POLICY IF EXISTS "Users with payment permissions can view" ON payments;
DROP POLICY IF EXISTS "Users with payment permissions can insert" ON payments;

CREATE POLICY "Users with payment permissions can view" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

CREATE POLICY "Users with payment permissions can insert" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero')
    )
  );

-- Políticas simplificadas para servicios
DROP POLICY IF EXISTS "Users with service permissions can manage" ON services;

CREATE POLICY "Users with service permissions can manage" ON services
  FOR ALL USING (
    is_active = true OR 
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

-- Políticas para otras tablas
DROP POLICY IF EXISTS "Users with patient permissions can view treatments" ON patient_treatments;
CREATE POLICY "Users with patient permissions can view treatments" ON patient_treatments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

DROP POLICY IF EXISTS "Users with patient permissions can view monthly status" ON monthly_status;
CREATE POLICY "Users with patient permissions can view monthly status" ON monthly_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true 
      AND u.role IN ('administrador', 'cajero', 'cosmetologa')
    )
  );

-- Asegurar que los roles por defecto existan con permisos correctos
INSERT INTO roles (name, description, permissions) VALUES 
('administrador', 'Administrador del sistema con acceso completo', '{
  "all": true,
  "dashboard": ["read", "create", "update", "delete"],
  "patients": ["read", "create", "update", "delete"],
  "appointments": ["read", "create", "update", "delete"],
  "services": ["read", "create", "update", "delete"],
  "payments": ["read", "create", "update", "delete"],
  "reports": ["read", "create", "update", "delete"],
  "import": ["read", "create", "update", "delete"],
  "roles": ["read", "create", "update", "delete"],
  "users": ["read", "create", "update", "delete"]
}'::jsonb),
('cajero', 'Personal de caja que gestiona reservas y pagos', '{
  "dashboard": ["read"],
  "patients": ["read", "create", "update"],
  "appointments": ["read", "create", "update"],
  "services": ["read"],
  "payments": ["read", "create"],
  "reports": ["read"],
  "import": ["read", "create"]
}'::jsonb),
('cosmetologa', 'Personal técnico que realiza tratamientos', '{
  "dashboard": ["read"],
  "patients": ["read", "update"],
  "appointments": ["read", "update"],
  "services": ["read"],
  "payments": ["read"],
  "reports": ["read"]
}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description;

-- Actualizar role_id para todos los usuarios
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL OR role_id != (
  SELECT r.id FROM roles r WHERE r.name = users.role
);

-- Crear función para obtener información completa del usuario
CREATE OR REPLACE FUNCTION get_user_info(user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR,
  role_id UUID,
  role_name VARCHAR,
  role_permissions JSONB,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.role_id,
    r.name as role_name,
    r.permissions as role_permissions,
    u.is_active
  FROM users u
  LEFT JOIN roles r ON u.role_id = r.id
  WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;