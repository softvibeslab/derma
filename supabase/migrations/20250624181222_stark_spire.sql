/*
  # Corrección del sistema de roles y permisos

  1. Problemas identificados
    - Los usuarios no tienen role_id asignado correctamente
    - Las políticas RLS están bloqueando el acceso
    - Los permisos no se están verificando correctamente

  2. Soluciones
    - Simplificar las políticas RLS
    - Asegurar que todos los usuarios tengan role_id
    - Crear permisos por defecto más permisivos para desarrollo
*/

-- Primero, deshabilitar RLS temporalmente para hacer las correcciones
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Asegurar que todos los usuarios existentes tengan role_id
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL;

-- Crear usuarios de prueba si no existen (para desarrollo)
INSERT INTO users (id, email, full_name, role, role_id) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'admin@dermacielo.com',
  'Administrador Sistema',
  'administrador',
  (SELECT id FROM roles WHERE name = 'administrador')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@dermacielo.com');

INSERT INTO users (id, email, full_name, role, role_id) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'cajero@dermacielo.com',
  'Cajero Sistema',
  'cajero',
  (SELECT id FROM roles WHERE name = 'cajero')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'cajero@dermacielo.com');

INSERT INTO users (id, email, full_name, role, role_id) 
SELECT 
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'cosmetologa@dermacielo.com',
  'Cosmetóloga Sistema',
  'cosmetologa',
  (SELECT id FROM roles WHERE name = 'cosmetologa')
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'cosmetologa@dermacielo.com');

-- Eliminar todas las políticas RLS existentes
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;
DROP POLICY IF EXISTS "Users with patient permissions can view" ON patients;
DROP POLICY IF EXISTS "Users with patient permissions can insert" ON patients;
DROP POLICY IF EXISTS "Users with patient permissions can update" ON patients;
DROP POLICY IF EXISTS "Users with appointment permissions can view" ON appointments;
DROP POLICY IF EXISTS "Users with appointment permissions can insert" ON appointments;
DROP POLICY IF EXISTS "Users with appointment permissions can update" ON appointments;
DROP POLICY IF EXISTS "Users with payment permissions can view" ON payments;
DROP POLICY IF EXISTS "Users with payment permissions can insert" ON payments;
DROP POLICY IF EXISTS "Users with service permissions can manage" ON services;
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Users with patient permissions can view treatments" ON patient_treatments;
DROP POLICY IF EXISTS "Users with patient permissions can view monthly status" ON monthly_status;
DROP POLICY IF EXISTS "Anyone can view sucursales" ON sucursales;
DROP POLICY IF EXISTS "Authenticated users can view promotions" ON promotions;

-- Crear políticas RLS más simples y permisivas
-- Política para usuarios: pueden ver y editar su propio perfil
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Política para administradores: pueden gestionar todos los usuarios
CREATE POLICY "Admins can manage all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'administrador'
      AND u.is_active = true
    )
  );

-- Políticas para roles: solo administradores
CREATE POLICY "Admins can manage roles" ON roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'administrador'
      AND u.is_active = true
    )
  );

-- Políticas para pacientes: usuarios autenticados pueden acceder
CREATE POLICY "Authenticated users can manage patients" ON patients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Políticas para citas: usuarios autenticados pueden acceder
CREATE POLICY "Authenticated users can manage appointments" ON appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Políticas para pagos: usuarios autenticados pueden acceder
CREATE POLICY "Authenticated users can manage payments" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Políticas para servicios: acceso público para lectura, autenticados para gestión
CREATE POLICY "Public can view services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Políticas para otras tablas: usuarios autenticados pueden acceder
CREATE POLICY "Authenticated users can manage treatments" ON patient_treatments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

CREATE POLICY "Authenticated users can manage monthly status" ON monthly_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Políticas para sucursales y promociones: acceso público
CREATE POLICY "Public can view sucursales" ON sucursales
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view promotions" ON promotions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() 
      AND u.is_active = true
    )
  );

-- Reactivar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Función simplificada para verificar si un usuario está autenticado y activo
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT u.role INTO user_role
  FROM users u
  WHERE u.id = auth.uid() AND u.is_active = true;
  
  RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar permisos de roles para ser más permisivos durante desarrollo
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

-- Asegurar que todos los usuarios tengan role_id actualizado
UPDATE users SET role_id = (
  SELECT r.id FROM roles r WHERE r.name = users.role
) WHERE role_id IS NULL OR role_id != (
  SELECT r.id FROM roles r WHERE r.name = users.role
);