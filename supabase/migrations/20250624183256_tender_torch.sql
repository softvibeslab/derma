/*
  # Solución final para el sistema de roles

  1. Simplificar completamente las políticas RLS
  2. Asegurar que todos los usuarios tengan roles válidos
  3. Crear políticas más permisivas para desarrollo
*/

-- Deshabilitar RLS temporalmente
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales DISABLE ROW LEVEL SECURITY;
ALTER TABLE promotions DISABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de todas las tablas
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Asegurar que los roles básicos existan
INSERT INTO roles (name, description, permissions) VALUES 
('administrador', 'Administrador del sistema', '{"all": true}'::jsonb),
('cajero', 'Personal de caja', '{"dashboard": ["read"], "patients": ["read", "create", "update"]}'::jsonb),
('cosmetologa', 'Personal técnico', '{"dashboard": ["read"], "patients": ["read", "update"]}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  permissions = EXCLUDED.permissions;

-- Asegurar que los usuarios de prueba existan
INSERT INTO users (id, email, full_name, role, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@dermacielo.com', 'Administrador', 'administrador', true),
('550e8400-e29b-41d4-a716-446655440002', 'cajero@dermacielo.com', 'Cajero', 'cajero', true),
('550e8400-e29b-41d4-a716-446655440003', 'cosmetologa@dermacielo.com', 'Cosmetóloga', 'cosmetologa', true)
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Crear políticas muy simples y permisivas

-- Usuarios: pueden ver su propio perfil y admins pueden ver todo
CREATE POLICY "users_policy" ON users FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrador' AND is_active = true)
);

-- Roles: solo admins
CREATE POLICY "roles_policy" ON roles FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'administrador' AND is_active = true)
);

-- Para todas las demás tablas: usuarios autenticados y activos pueden acceder
CREATE POLICY "patients_policy" ON patients FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "appointments_policy" ON appointments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "payments_policy" ON payments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "services_policy" ON services FOR ALL USING (
  is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "patient_treatments_policy" ON patient_treatments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

CREATE POLICY "monthly_status_policy" ON monthly_status FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

-- Sucursales y promociones: acceso público para lectura
CREATE POLICY "sucursales_policy" ON sucursales FOR SELECT USING (true);

CREATE POLICY "promotions_policy" ON promotions FOR SELECT USING (
  is_active = true OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
);

-- Reactivar RLS
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

-- Función simple para verificar si un usuario está autenticado
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid() AND is_active = true;
  
  RETURN COALESCE(user_role, 'guest');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;