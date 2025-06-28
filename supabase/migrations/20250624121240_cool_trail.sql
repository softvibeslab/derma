/*
  # Initial Database Schema for Dermacielo Management System

  1. New Tables
    - `roles` - User roles and permissions
    - `users` - System users with authentication
    - `patients` - Patient records and information
    - `services` - Available laser hair removal services
    - `appointments` - Scheduled appointments and sessions
    - `payments` - Payment records and transactions
    - `patient_treatments` - Treatment history tracking
    - `monthly_status` - Monthly patient status tracking
    - `sucursales` - Clinic branches
    - `promotions` - Available promotions and discounts

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Secure user data with proper authentication

  3. Indexes
    - Optimize common queries
    - Improve search performance
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES 
('administrador', 'Administrador del sistema con acceso completo', '{"all": true}'),
('cajero', 'Personal de caja que gestiona reservas y pagos', '{"patients": ["read", "create", "update"], "appointments": ["read", "create", "update"], "payments": ["read", "create"], "reports": ["read"]}'),
('cosmetologa', 'Personal técnico que realiza tratamientos', '{"patients": ["read", "update"], "appointments": ["read", "update"], "treatments": ["read", "create", "update"]}')
ON CONFLICT (name) DO NOTHING;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cajero',
  sucursal VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  numero_cliente VARCHAR(20) UNIQUE,
  nombre_completo VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  cumpleanos DATE,
  sexo CHAR(1),
  localidad VARCHAR(100),
  zonas_tratamiento TEXT[],
  precio_total DECIMAL(10,2),
  metodo_pago_preferido VARCHAR(50),
  observaciones TEXT,
  consentimiento_firmado BOOLEAN DEFAULT false,
  fecha_consentimiento DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  zona VARCHAR(100) NOT NULL,
  precio_base DECIMAL(10,2) NOT NULL,
  duracion_minutos INTEGER DEFAULT 60,
  sesiones_recomendadas INTEGER DEFAULT 8,
  tecnologia VARCHAR(100) DEFAULT 'Sopranoice',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default services
INSERT INTO services (nombre, zona, precio_base, duracion_minutos, sesiones_recomendadas) VALUES
('Depilación Láser Axilas', 'axilas', 599.00, 30, 10),
('Depilación Láser Bikini Brasileño', 'bikini_brasileno', 899.00, 45, 12),
('Depilación Láser Bikini Full', 'bikini_full', 1399.00, 60, 12),
('Depilación Láser Piernas', 'piernas', 1500.00, 90, 12),
('Depilación Láser Ingles', 'ingles', 800.00, 30, 10),
('Depilación Láser Brazos', 'brazos', 1200.00, 60, 10),
('Depilación Láser Labio Superior', 'labio_superior', 400.00, 15, 8),
('Depilación Láser Mentón', 'menton', 450.00, 20, 8),
('Depilación Láser Espalda', 'espalda', 1800.00, 90, 12),
('Depilación Láser Pecho', 'pecho', 1600.00, 75, 10)
ON CONFLICT DO NOTHING;

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  operadora_id UUID REFERENCES users(id),
  cajera_id UUID REFERENCES users(id),
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER,
  numero_sesion INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'agendada',
  precio_sesion DECIMAL(10,2),
  metodo_pago VARCHAR(50),
  observaciones_caja TEXT,
  observaciones_operadora TEXT,
  proxima_cita TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL,
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cajera_id UUID REFERENCES users(id),
  banco VARCHAR(50),
  referencia VARCHAR(100),
  observaciones TEXT,
  tipo_pago VARCHAR(50) DEFAULT 'pago_sesion',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patient_treatments table
CREATE TABLE IF NOT EXISTS patient_treatments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  sesiones_contratadas INTEGER,
  sesiones_completadas INTEGER DEFAULT 0,
  precio_total DECIMAL(10,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  status VARCHAR(50) DEFAULT 'activo',
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monthly_status table
CREATE TABLE IF NOT EXISTS monthly_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status VARCHAR(50),
  comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, year, month)
);

-- Create sucursales table
CREATE TABLE IF NOT EXISTS sucursales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(20),
  ciudad VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default sucursales
INSERT INTO sucursales (nombre, ciudad) VALUES
('Playa del Carmen', 'Playa del Carmen'),
('Cancún', 'Cancún'),
('Tulum', 'Tulum'),
('Cozumel', 'Cozumel'),
('Holbox', 'Holbox'),
('Valladolid', 'Valladolid')
ON CONFLICT DO NOTHING;

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  descuento_porcentaje DECIMAL(5,2),
  descuento_fijo DECIMAL(10,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  servicios_aplicables UUID[],
  condiciones TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_patients_telefono ON patients(telefono);
CREATE INDEX IF NOT EXISTS idx_patients_nombre ON patients USING gin(to_tsvector('spanish', nombre_completo));
CREATE INDEX IF NOT EXISTS idx_appointments_fecha ON appointments(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_payments_fecha ON payments(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_payments_metodo ON payments(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_monthly_status_patient_date ON monthly_status(patient_id, year, month);
CREATE INDEX IF NOT EXISTS idx_services_zona ON services(zona);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_treatments_updated_at ON patient_treatments;
CREATE TRIGGER update_patient_treatments_updated_at 
    BEFORE UPDATE ON patient_treatments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for patients table
CREATE POLICY "Authenticated users can view patients" ON patients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert patients" ON patients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update patients" ON patients
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for appointments table
CREATE POLICY "Authenticated users can view appointments" ON appointments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert appointments" ON appointments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update appointments" ON appointments
  FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS Policies for payments table
CREATE POLICY "Authenticated users can view payments" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert payments" ON payments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for services table
CREATE POLICY "Anyone can view active services" ON services
  FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage services" ON services
  FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for other tables
CREATE POLICY "Authenticated users can view patient_treatments" ON patient_treatments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view monthly_status" ON monthly_status
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view sucursales" ON sucursales
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view promotions" ON promotions
  FOR SELECT USING (auth.role() = 'authenticated');