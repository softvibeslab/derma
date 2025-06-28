# Diseño de Base de Datos para Sistema de Gestión Dermacielo

## Estructura de Tablas para Superbase

### 1. Tabla: users (Usuarios del sistema)
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role_id UUID REFERENCES roles(id),
  sucursal VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Tabla: roles (Roles del sistema)
```sql
CREATE TABLE roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB, -- Almacena permisos como JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar roles por defecto
INSERT INTO roles (name, description, permissions) VALUES 
('administrador', 'Administrador del sistema con acceso completo', '{"all": true}'),
('cajero', 'Personal de caja que gestiona reservas y pagos', '{"patients": ["read", "create", "update"], "appointments": ["read", "create", "update"], "payments": ["read", "create"], "reports": ["read"]}'),
('cosmetologa', 'Personal técnico que realiza tratamientos', '{"patients": ["read", "update"], "appointments": ["read", "update"], "treatments": ["read", "create", "update"]}');
```

### 3. Tabla: patients (Pacientes)
```sql
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cliente VARCHAR(20) UNIQUE,
  nombre_completo VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  cumpleanos DATE,
  sexo CHAR(1),
  localidad VARCHAR(100),
  zonas_tratamiento TEXT[], -- Array de zonas (axilas, bikini, etc.)
  precio_total DECIMAL(10,2),
  metodo_pago_preferido VARCHAR(50),
  observaciones TEXT,
  consentimiento_firmado BOOLEAN DEFAULT false,
  fecha_consentimiento DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Tabla: services (Servicios)
```sql
CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  zona VARCHAR(100), -- axilas, bikini, etc.
  precio_base DECIMAL(10,2) NOT NULL,
  duracion_minutos INTEGER,
  sesiones_recomendadas INTEGER,
  tecnologia VARCHAR(100) DEFAULT 'Sopranoice',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar servicios básicos basados en la web
INSERT INTO services (nombre, zona, precio_base, duracion_minutos, sesiones_recomendadas) VALUES
('Depilación Láser Axilas', 'axilas', 599.00, 30, 10),
('Depilación Láser Bikini Brasileño', 'bikini_brasileno', 899.00, 45, 12),
('Depilación Láser Bikini Full', 'bikini_full', 1399.00, 60, 12),
('Depilación Láser Piernas', 'piernas', 1500.00, 90, 12),
('Depilación Láser Ingles', 'ingles', 800.00, 30, 10);
```

### 5. Tabla: appointments (Citas)
```sql
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  operadora_id UUID REFERENCES users(id),
  cajera_id UUID REFERENCES users(id),
  fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion_minutos INTEGER,
  numero_sesion INTEGER,
  status VARCHAR(50) DEFAULT 'agendada', -- agendada, confirmada, completada, cancelada, no_agendada
  precio_sesion DECIMAL(10,2),
  metodo_pago VARCHAR(50),
  observaciones_caja TEXT,
  observaciones_operadora TEXT,
  proxima_cita TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 6. Tabla: payments (Pagos)
```sql
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  monto DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL, -- efectivo, transferencia, bbva, clip
  fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cajera_id UUID REFERENCES users(id),
  banco VARCHAR(50),
  referencia VARCHAR(100),
  observaciones TEXT,
  tipo_pago VARCHAR(50) DEFAULT 'pago_sesion', -- pago_sesion, abono, transferencia
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7. Tabla: patient_treatments (Historial de tratamientos por paciente)
```sql
CREATE TABLE patient_treatments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  sesiones_contratadas INTEGER,
  sesiones_completadas INTEGER DEFAULT 0,
  precio_total DECIMAL(10,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  status VARCHAR(50) DEFAULT 'activo', -- activo, pausado, completado, cancelado
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 8. Tabla: monthly_status (Status mensual de pacientes - basado en el Excel)
```sql
CREATE TABLE monthly_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status VARCHAR(50), -- agendada, no_agendada, pausada, etc.
  comentarios TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(patient_id, year, month)
);
```

### 9. Tabla: sucursales (Sucursales)
```sql
CREATE TABLE sucursales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  direccion TEXT,
  telefono VARCHAR(20),
  ciudad VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar sucursales basadas en la web
INSERT INTO sucursales (nombre, ciudad) VALUES
('Playa del Carmen', 'Playa del Carmen'),
('Cancún', 'Cancún'),
('Tulum', 'Tulum'),
('Cozumel', 'Cozumel'),
('Holbox', 'Holbox'),
('Valladolid', 'Valladolid');
```

### 10. Tabla: promotions (Promociones)
```sql
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  descuento_porcentaje DECIMAL(5,2),
  descuento_fijo DECIMAL(10,2),
  fecha_inicio DATE,
  fecha_fin DATE,
  servicios_aplicables UUID[], -- Array de IDs de servicios
  condiciones TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuración de Row Level Security (RLS) en Superbase

### Políticas de seguridad por tabla:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para usuarios: solo pueden ver/editar su propio perfil
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Política para pacientes: cajeros y administradores pueden ver todos
CREATE POLICY "Staff can view patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role_id IN (
        SELECT id FROM roles WHERE name IN ('administrador', 'cajero', 'cosmetologa')
      )
    )
  );

-- Política para citas: staff puede ver todas las citas
CREATE POLICY "Staff can view appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role_id IN (
        SELECT id FROM roles WHERE name IN ('administrador', 'cajero', 'cosmetologa')
      )
    )
  );
```

## Índices para optimización

```sql
-- Índices para mejorar el rendimiento
CREATE INDEX idx_patients_telefono ON patients(telefono);
CREATE INDEX idx_patients_nombre ON patients(nombre_completo);
CREATE INDEX idx_appointments_fecha ON appointments(fecha_hora);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_fecha ON payments(fecha_pago);
CREATE INDEX idx_monthly_status_patient_date ON monthly_status(patient_id, year, month);
```

## Funciones y Triggers

```sql
-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

