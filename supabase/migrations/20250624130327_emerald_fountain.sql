/*
  # Actualización del sistema de roles y permisos

  1. Modificaciones a la tabla users
    - Agregar foreign key a la tabla roles
    - Actualizar usuarios existentes con roles apropiados
  
  2. Actualización de permisos
    - Mejorar la estructura de permisos en la tabla roles
    - Agregar permisos más granulares por módulo
  
  3. Políticas de seguridad
    - Actualizar RLS policies para usar el nuevo sistema de roles
    - Agregar políticas específicas para cada tipo de usuario
*/

-- Primero, actualizar la tabla users para usar foreign key a roles
DO $$
BEGIN
  -- Verificar si la columna role_id ya existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'role_id'
  ) THEN
    -- Agregar columna role_id
    ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);
  END IF;
END $$;

-- Actualizar usuarios existentes para vincular con roles
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL;

-- Actualizar permisos de roles con estructura más detallada
UPDATE roles SET permissions = '{
  "dashboard": ["read"],
  "patients": ["read", "create", "update"],
  "appointments": ["read", "create", "update"],
  "services": ["read"],
  "payments": ["read", "create"],
  "reports": ["read"],
  "import": ["read", "create"]
}'::jsonb WHERE name = 'cajero';

UPDATE roles SET permissions = '{
  "dashboard": ["read"],
  "patients": ["read", "update"],
  "appointments": ["read", "update"],
  "services": ["read"],
  "payments": ["read"],
  "reports": ["read"]
}'::jsonb WHERE name = 'cosmetologa';

UPDATE roles SET permissions = '{
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
}'::jsonb WHERE name = 'administrador';

-- Crear función para verificar permisos
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, module_name TEXT, action_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  module_permissions JSONB;
BEGIN
  -- Obtener permisos del usuario
  SELECT r.permissions INTO user_permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = user_id;

  -- Si no hay permisos, denegar acceso
  IF user_permissions IS NULL THEN
    RETURN FALSE;
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

-- Crear función para obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar políticas RLS para usar el nuevo sistema

-- Política para la tabla roles (solo administradores)
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;
CREATE POLICY "Only admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'administrador'
    )
  );

-- Habilitar RLS en la tabla roles
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Actualizar políticas para usuarios
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'administrador'
    )
  );

-- Política para que usuarios puedan ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Política para que usuarios puedan actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Actualizar políticas para pacientes con verificación de permisos
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
CREATE POLICY "Users with patient permissions can view" ON patients
  FOR SELECT USING (
    has_permission(auth.uid(), 'patients', 'read')
  );

DROP POLICY IF EXISTS "Authenticated users can insert patients" ON patients;
CREATE POLICY "Users with patient permissions can insert" ON patients
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'patients', 'create')
  );

DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
CREATE POLICY "Users with patient permissions can update" ON patients
  FOR UPDATE USING (
    has_permission(auth.uid(), 'patients', 'update')
  );

-- Actualizar políticas para citas
DROP POLICY IF EXISTS "Authenticated users can view appointments" ON appointments;
CREATE POLICY "Users with appointment permissions can view" ON appointments
  FOR SELECT USING (
    has_permission(auth.uid(), 'appointments', 'read')
  );

DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON appointments;
CREATE POLICY "Users with appointment permissions can insert" ON appointments
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'appointments', 'create')
  );

DROP POLICY IF EXISTS "Authenticated users can update appointments" ON appointments;
CREATE POLICY "Users with appointment permissions can update" ON appointments
  FOR UPDATE USING (
    has_permission(auth.uid(), 'appointments', 'update')
  );

-- Actualizar políticas para pagos
DROP POLICY IF EXISTS "Authenticated users can view payments" ON payments;
CREATE POLICY "Users with payment permissions can view" ON payments
  FOR SELECT USING (
    has_permission(auth.uid(), 'payments', 'read')
  );

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON payments;
CREATE POLICY "Users with payment permissions can insert" ON payments
  FOR INSERT WITH CHECK (
    has_permission(auth.uid(), 'payments', 'create')
  );

-- Actualizar políticas para servicios
DROP POLICY IF EXISTS "Authenticated users can manage services" ON services;
CREATE POLICY "Users with service permissions can manage" ON services
  FOR ALL USING (
    has_permission(auth.uid(), 'services', 'read') OR
    has_permission(auth.uid(), 'services', 'create') OR
    has_permission(auth.uid(), 'services', 'update') OR
    has_permission(auth.uid(), 'services', 'delete')
  );

-- Políticas para otras tablas
DROP POLICY IF EXISTS "Authenticated users can view patient_treatments" ON patient_treatments;
CREATE POLICY "Users with patient permissions can view treatments" ON patient_treatments
  FOR ALL USING (
    has_permission(auth.uid(), 'patients', 'read')
  );

DROP POLICY IF EXISTS "Authenticated users can view monthly_status" ON monthly_status;
CREATE POLICY "Users with patient permissions can view monthly status" ON monthly_status
  FOR ALL USING (
    has_permission(auth.uid(), 'patients', 'read')
  );

-- Crear vista para obtener usuarios con información de roles
CREATE OR REPLACE VIEW user_profiles AS
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
LEFT JOIN roles r ON u.role_id = r.id;

-- Crear función para sincronizar role con role_id
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se actualiza el role, actualizar role_id
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    SELECT id INTO NEW.role_id
    FROM roles
    WHERE name = NEW.role;
  END IF;
  
  -- Si se actualiza role_id, actualizar role
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    SELECT name INTO NEW.role
    FROM roles
    WHERE id = NEW.role_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sincronización
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Insertar datos de ejemplo para roles personalizados
INSERT INTO roles (name, description, permissions) VALUES
('supervisor', 'Supervisor de sucursal con permisos extendidos', '{
  "dashboard": ["read"],
  "patients": ["read", "create", "update"],
  "appointments": ["read", "create", "update", "delete"],
  "services": ["read", "update"],
  "payments": ["read", "create", "update"],
  "reports": ["read", "create"],
  "import": ["read", "create"]
}'::jsonb),
('recepcionista', 'Personal de recepción con permisos limitados', '{
  "dashboard": ["read"],
  "patients": ["read", "create"],
  "appointments": ["read", "create", "update"],
  "services": ["read"],
  "payments": ["read"]
}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Actualizar role_id para usuarios existentes que no lo tengan
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Función para obtener permisos de usuario
CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  SELECT r.permissions INTO user_permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = user_id AND u.is_active = true;
  
  RETURN COALESCE(user_permissions, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;