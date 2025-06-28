/*
  # Sample Data for Dermacielo Management System

  1. Sample Data
    - Insert sample users (will need to be created through Supabase Auth)
    - Insert sample patients with various treatment zones
    - Insert sample appointments with different statuses
    - Insert sample payments for completed sessions
    - Insert sample patient treatments and progress
    - Insert sample monthly status records
    - Insert sample promotions and discounts

  2. Data Relationships
    - Link patients to their appointments and treatments
    - Connect payments to specific appointments
    - Associate treatments with services and patients
*/

-- Insert sample users (Note: These will need to be created through Supabase Auth UI)
INSERT INTO users (id, email, full_name, role, sucursal) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@dermacielo.com', 'María González', 'administrador', 'Playa del Carmen'),
('550e8400-e29b-41d4-a716-446655440002', 'cajero@dermacielo.com', 'Ana Rodríguez', 'cajero', 'Playa del Carmen'),
('550e8400-e29b-41d4-a716-446655440003', 'cosmetologa@dermacielo.com', 'Carmen López', 'cosmetologa', 'Playa del Carmen')
ON CONFLICT (email) DO NOTHING;

-- Insert sample patients
INSERT INTO patients (nombre_completo, telefono, cumpleanos, sexo, localidad, zonas_tratamiento, precio_total, metodo_pago_preferido, observaciones, consentimiento_firmado) VALUES
('Sofia Martínez García', '9841234567', '1992-03-15', 'F', 'Playa del Carmen', ARRAY['axilas', 'piernas'], 2099.00, 'efectivo', 'Piel sensible, usar gel calmante', true),
('Isabella Hernández López', '9847654321', '1988-07-22', 'F', 'Cancún', ARRAY['bikini_brasileno', 'axilas'], 1498.00, 'transferencia', 'Primera vez con láser', true),
('Valentina Rodríguez Pérez', '9843216789', '1995-11-08', 'F', 'Tulum', ARRAY['piernas', 'brazos'], 2700.00, 'bbva', 'Atleta profesional', true),
('Camila Torres Sánchez', '9849876543', '1990-05-30', 'F', 'Cozumel', ARRAY['axilas', 'labio_superior'], 999.00, 'clip', 'Alergia a ciertos productos', true),
('Lucía Morales Castro', '9842468135', '1993-09-12', 'F', 'Playa del Carmen', ARRAY['bikini_full', 'axilas'], 1998.00, 'efectivo', 'Cliente frecuente', true),
('Fernanda Jiménez Ruiz', '9845792468', '1987-12-03', 'F', 'Cancún', ARRAY['ingles', 'menton'], 1250.00, 'transferencia', 'Embarazo reciente, esperar 6 meses', false),
('Daniela Vargas Mendoza', '9848024681', '1996-04-18', 'F', 'Valladolid', ARRAY['espalda', 'brazos'], 3000.00, 'bbva', 'Tratamiento completo', true),
('Alejandra Cruz Flores', '9843691472', '1991-08-25', 'F', 'Holbox', ARRAY['piernas', 'bikini_brasileno'], 2399.00, 'efectivo', 'Viaja frecuentemente', true),
('Paola Ramírez Aguilar', '9847531598', '1994-01-14', 'F', 'Playa del Carmen', ARRAY['axilas', 'brazos', 'labio_superior'], 2199.00, 'clip', 'Piel muy clara', true),
('Andrea Castillo Vega', '9842587419', '1989-06-07', 'F', 'Tulum', ARRAY['pecho', 'espalda'], 3400.00, 'transferencia', 'Tratamiento masculino', true);

-- Insert sample appointments for the current month
-- First, let's create appointments for axilas service
INSERT INTO appointments (patient_id, service_id, operadora_id, fecha_hora, numero_sesion, status, precio_sesion, metodo_pago, observaciones_caja) 
SELECT 
  p.id,
  s.id,
  '550e8400-e29b-41d4-a716-446655440003',
  CURRENT_DATE + INTERVAL '1 day' + (RANDOM() * INTERVAL '30 days'),
  1,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'agendada'
    WHEN RANDOM() < 0.6 THEN 'confirmada'
    WHEN RANDOM() < 0.9 THEN 'completada'
    ELSE 'cancelada'
  END,
  s.precio_base,
  CASE 
    WHEN RANDOM() < 0.4 THEN 'efectivo'
    WHEN RANDOM() < 0.6 THEN 'transferencia'
    WHEN RANDOM() < 0.8 THEN 'bbva'
    ELSE 'clip'
  END,
  'Sesión inicial'
FROM patients p
CROSS JOIN services s
WHERE s.zona = 'axilas' AND 'axilas' = ANY(p.zonas_tratamiento)
LIMIT 5;

-- Insert appointments for piernas service
INSERT INTO appointments (patient_id, service_id, operadora_id, fecha_hora, numero_sesion, status, precio_sesion, metodo_pago, observaciones_caja) 
SELECT 
  p.id,
  s.id,
  '550e8400-e29b-41d4-a716-446655440003',
  CURRENT_DATE + INTERVAL '2 days' + (RANDOM() * INTERVAL '30 days'),
  1,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'agendada'
    WHEN RANDOM() < 0.6 THEN 'confirmada'
    WHEN RANDOM() < 0.9 THEN 'completada'
    ELSE 'cancelada'
  END,
  s.precio_base,
  CASE 
    WHEN RANDOM() < 0.4 THEN 'efectivo'
    WHEN RANDOM() < 0.6 THEN 'transferencia'
    WHEN RANDOM() < 0.8 THEN 'bbva'
    ELSE 'clip'
  END,
  'Sesión inicial'
FROM patients p
CROSS JOIN services s
WHERE s.zona = 'piernas' AND 'piernas' = ANY(p.zonas_tratamiento)
LIMIT 5;

-- Insert appointments for bikini services
INSERT INTO appointments (patient_id, service_id, operadora_id, fecha_hora, numero_sesion, status, precio_sesion, metodo_pago, observaciones_caja) 
SELECT 
  p.id,
  s.id,
  '550e8400-e29b-41d4-a716-446655440003',
  CURRENT_DATE + INTERVAL '3 days' + (RANDOM() * INTERVAL '30 days'),
  1,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'agendada'
    WHEN RANDOM() < 0.6 THEN 'confirmada'
    WHEN RANDOM() < 0.9 THEN 'completada'
    ELSE 'cancelada'
  END,
  s.precio_base,
  CASE 
    WHEN RANDOM() < 0.4 THEN 'efectivo'
    WHEN RANDOM() < 0.6 THEN 'transferencia'
    WHEN RANDOM() < 0.8 THEN 'bbva'
    ELSE 'clip'
  END,
  'Sesión inicial'
FROM patients p
CROSS JOIN services s
WHERE s.zona IN ('bikini_brasileno', 'bikini_full') 
  AND (s.zona = ANY(p.zonas_tratamiento))
LIMIT 5;

-- Insert appointments for other services
INSERT INTO appointments (patient_id, service_id, operadora_id, fecha_hora, numero_sesion, status, precio_sesion, metodo_pago, observaciones_caja) 
SELECT 
  p.id,
  s.id,
  '550e8400-e29b-41d4-a716-446655440003',
  CURRENT_DATE + INTERVAL '4 days' + (RANDOM() * INTERVAL '30 days'),
  1,
  CASE 
    WHEN RANDOM() < 0.3 THEN 'agendada'
    WHEN RANDOM() < 0.6 THEN 'confirmada'
    WHEN RANDOM() < 0.9 THEN 'completada'
    ELSE 'cancelada'
  END,
  s.precio_base,
  CASE 
    WHEN RANDOM() < 0.4 THEN 'efectivo'
    WHEN RANDOM() < 0.6 THEN 'transferencia'
    WHEN RANDOM() < 0.8 THEN 'bbva'
    ELSE 'clip'
  END,
  'Sesión inicial'
FROM patients p
CROSS JOIN services s
WHERE s.zona IN ('brazos', 'labio_superior', 'menton', 'ingles', 'espalda', 'pecho') 
  AND (s.zona = ANY(p.zonas_tratamiento))
LIMIT 5;

-- Insert sample payments for completed appointments
INSERT INTO payments (patient_id, appointment_id, monto, metodo_pago, cajera_id, observaciones, tipo_pago)
SELECT 
  a.patient_id,
  a.id,
  a.precio_sesion,
  a.metodo_pago,
  '550e8400-e29b-41d4-a716-446655440002',
  'Pago sesión ' || a.numero_sesion,
  'pago_sesion'
FROM appointments a
WHERE a.status = 'completada' AND a.precio_sesion IS NOT NULL;

-- Insert sample patient treatments for axilas
INSERT INTO patient_treatments (patient_id, service_id, sesiones_contratadas, sesiones_completadas, precio_total, fecha_inicio, status)
SELECT 
  p.id,
  s.id,
  s.sesiones_recomendadas,
  FLOOR(RANDOM() * s.sesiones_recomendadas)::INTEGER,
  s.precio_base * s.sesiones_recomendadas,
  CURRENT_DATE - INTERVAL '30 days',
  CASE 
    WHEN RANDOM() < 0.7 THEN 'activo'
    WHEN RANDOM() < 0.9 THEN 'pausado'
    ELSE 'completado'
  END
FROM patients p
CROSS JOIN services s
WHERE s.zona = 'axilas' AND 'axilas' = ANY(p.zonas_tratamiento)
LIMIT 5;

-- Insert sample patient treatments for piernas
INSERT INTO patient_treatments (patient_id, service_id, sesiones_contratadas, sesiones_completadas, precio_total, fecha_inicio, status)
SELECT 
  p.id,
  s.id,
  s.sesiones_recomendadas,
  FLOOR(RANDOM() * s.sesiones_recomendadas)::INTEGER,
  s.precio_base * s.sesiones_recomendadas,
  CURRENT_DATE - INTERVAL '45 days',
  CASE 
    WHEN RANDOM() < 0.7 THEN 'activo'
    WHEN RANDOM() < 0.9 THEN 'pausado'
    ELSE 'completado'
  END
FROM patients p
CROSS JOIN services s
WHERE s.zona = 'piernas' AND 'piernas' = ANY(p.zonas_tratamiento)
LIMIT 5;

-- Insert sample patient treatments for bikini services
INSERT INTO patient_treatments (patient_id, service_id, sesiones_contratadas, sesiones_completadas, precio_total, fecha_inicio, status)
SELECT 
  p.id,
  s.id,
  s.sesiones_recomendadas,
  FLOOR(RANDOM() * s.sesiones_recomendadas)::INTEGER,
  s.precio_base * s.sesiones_recomendadas,
  CURRENT_DATE - INTERVAL '60 days',
  CASE 
    WHEN RANDOM() < 0.7 THEN 'activo'
    WHEN RANDOM() < 0.9 THEN 'pausado'
    ELSE 'completado'
  END
FROM patients p
CROSS JOIN services s
WHERE s.zona IN ('bikini_brasileno', 'bikini_full') 
  AND (s.zona = ANY(p.zonas_tratamiento))
LIMIT 5;

-- Insert sample monthly status
INSERT INTO monthly_status (patient_id, year, month, status, comentarios)
SELECT 
  p.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  CASE 
    WHEN RANDOM() < 0.6 THEN 'agendada'
    WHEN RANDOM() < 0.8 THEN 'no_agendada'
    ELSE 'pausada'
  END,
  'Status mensual automático'
FROM patients p;

-- Insert sample promotions
INSERT INTO promotions (nombre, descripcion, descuento_porcentaje, fecha_inicio, fecha_fin, is_active) VALUES
('Promoción Verano 2025', 'Descuento especial en tratamientos de piernas y axilas', 15.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', true),
('Paquete Novia', 'Descuento para novias en tratamiento completo', 20.00, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '90 days', true),
('Descuento Estudiante', 'Descuento especial para estudiantes', 10.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '365 days', true);