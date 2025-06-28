/*
  # Importación de servicios desde lista de precios

  1. Servicios de limpieza facial y corporal
  2. Tratamientos correctivos (peelings, dermapen)
  3. Tratamientos anti-hongos
  4. Masajes terapéuticos y relajantes
  5. Servicios especiales y paquetes

  Nota: Este archivo contiene los datos extraídos del CSV de precios
*/

-- Insertar servicios de limpieza facial y corporal
INSERT INTO services (nombre, descripcion, zona, precio_base, duracion_minutos, sesiones_recomendadas, tecnologia) VALUES

-- Limpiezas faciales y corporales de mantenimiento
('Limpieza Profunda + Micro (60 min)', 'Limpieza facial profunda con microdermoabrasión para rostro, glúteos o espalda', 'rostro', 1200.00, 60, 3, 'Microdermoabrasión'),
('Limpieza Profunda + Micro - Glúteos', 'Limpieza profunda con microdermoabrasión para glúteos', 'gluteos', 1200.00, 60, 3, 'Microdermoabrasión'),
('Limpieza Profunda + Micro - Espalda', 'Limpieza profunda con microdermoabrasión para espalda', 'espalda', 1200.00, 60, 3, 'Microdermoabrasión'),

('Limpieza Teens + Hidratación', 'Limpieza e hidratación con ultrasonido para rostro', 'rostro', 900.00, 30, 1, 'Ultrasonido'),
('Limpieza Teens - Axilas', 'Limpieza e hidratación con ultrasonido para axilas', 'axilas', 900.00, 30, 1, 'Ultrasonido'),
('Limpieza Teens - Entre Piernas', 'Limpieza e hidratación con ultrasonido para entre piernas', 'ingles', 900.00, 30, 1, 'Ultrasonido'),
('Limpieza Teens - Glúteos', 'Limpieza e hidratación con ultrasonido para glúteos', 'gluteos', 900.00, 30, 1, 'Ultrasonido'),

('Renovación Vello Enterrado - Pubis', 'Tratamiento especializado para vello enterrado en zona púbica', 'bikini_full', 1000.00, 45, 3, 'Renovación Celular'),
('Renovación Vello Enterrado - Ingles', 'Tratamiento especializado para vello enterrado en ingles', 'ingles', 1000.00, 45, 3, 'Renovación Celular'),
('Renovación Vello Enterrado - Axilas', 'Tratamiento especializado para vello enterrado en axilas', 'axilas', 1000.00, 45, 3, 'Renovación Celular'),

('Renovación de Escote', 'Tratamiento de renovación celular para escote', 'escote', 1000.00, 45, 5, 'Renovación Celular'),

-- Tratamientos correctivos
('Peeling Acné y Despigmentante - 1 Zona', 'Peeling químico para tratamiento de acné y manchas en rostro', 'rostro', 3250.00, 60, 3, 'Peeling Químico'),
('Peeling Acné - Axilas', 'Peeling químico para tratamiento de acné y manchas en axilas', 'axilas', 3250.00, 45, 3, 'Peeling Químico'),
('Peeling Acné - Ingles', 'Peeling químico para tratamiento de acné y manchas en ingles', 'ingles', 3250.00, 45, 3, 'Peeling Químico'),

('Peeling Acné y Despigmentante - 2 Zonas', 'Peeling químico para tratamiento de acné y manchas en dos zonas', 'rostro', 4875.00, 90, 3, 'Peeling Químico'),

('Dermapen Facial', 'Microagujas para regeneración facial', 'rostro', 2000.00, 60, 5, 'Dermapen'),
('Baby Glow Facial', 'Tratamiento rejuvenecedor suave para rostro', 'rostro', 2000.00, 60, 5, 'Baby Glow'),
('Hollywood Peel Facial', 'Peeling con láser Hollywood para rostro', 'rostro', 2000.00, 60, 5, 'Hollywood Peel'),

('Limpieza Profunda + Dermapen Rostro', 'Combinación de limpieza profunda con dermapen para rostro', 'rostro', 3000.00, 90, 5, 'Dermapen'),
('Limpieza Profunda + Dermapen Escote', 'Combinación de limpieza profunda con dermapen para escote', 'escote', 3000.00, 90, 5, 'Dermapen'),

('Dermapen 2 Zonas', 'Tratamiento con dermapen para rostro y escote', 'rostro', 3600.00, 120, 5, 'Dermapen'),
('Limpieza + Dermapen 2 Zonas', 'Limpieza profunda con dermapen para rostro y escote', 'rostro', 3150.00, 150, 5, 'Dermapen'),

('Dermapen Corporal - Escote', 'Dermapen para tratamiento corporal en escote', 'escote', 1800.00, 60, 5, 'Dermapen'),
('Hollywood Peel Corporal - Brazos', 'Hollywood Peel para brazos', 'brazos', 1800.00, 60, 5, 'Hollywood Peel'),
('Dermapen Corporal - Manos', 'Dermapen para rejuvenecimiento de manos', 'manos', 1800.00, 45, 5, 'Dermapen'),
('Dermapen Corporal - Glúteos', 'Dermapen para tratamiento de glúteos', 'gluteos', 1800.00, 60, 5, 'Dermapen'),

('Radiofrecuencia Facial', 'Tratamiento de flacidez con radiofrecuencia para rostro', 'rostro', 4250.00, 60, 8, 'Radiofrecuencia'),
('Radiofrecuencia Cuello', 'Tratamiento de flacidez con radiofrecuencia para cuello', 'cuello', 4250.00, 45, 8, 'Radiofrecuencia'),
('Radiofrecuencia Glúteos', 'Tratamiento de flacidez con radiofrecuencia para glúteos', 'gluteos', 4250.00, 60, 8, 'Radiofrecuencia'),
('Radiofrecuencia 3 Zonas', 'Radiofrecuencia para rostro, cuello y escote', 'rostro', 5999.00, 120, 8, 'Radiofrecuencia'),

('Mix Limpieza + Dermapen + Hollywood', 'Tratamiento completo combinado para rostro', 'rostro', 3950.00, 120, 3, 'Tratamiento Mixto'),

-- Tratamientos anti-hongos
('Tratamiento Anti-Hongos (1-3 uñas)', 'Tratamiento especializado para hongos en uñas (1 a 3 uñas)', 'uñas', 5495.00, 30, 10, 'Tratamiento Antimicótico'),
('Tratamiento Anti-Hongos (4-6 uñas)', 'Tratamiento especializado para hongos en uñas (4 a 6 uñas)', 'uñas', 7495.00, 45, 10, 'Tratamiento Antimicótico'),
('Tratamiento Anti-Hongos (7+ uñas)', 'Tratamiento especializado para hongos en uñas (7 o más uñas)', 'uñas', 8999.00, 60, 10, 'Tratamiento Antimicótico'),

-- Masajes terapéuticos
('Masaje Relajante', 'Masaje relajante de cuerpo completo', 'cuerpo_completo', 1200.00, 90, 1, 'Masoterapia'),
('Masaje Tejido Profundo - Espalda', 'Masaje terapéutico con diclogel para espalda', 'espalda', 1200.00, 60, 1, 'Masoterapia'),
('Masaje Tejido Profundo - Piernas', 'Masaje terapéutico con diclogel para piernas cansadas', 'piernas', 1200.00, 60, 1, 'Masoterapia'),
('Masaje Piedras Calientes', 'Masaje relajante con piedras calientes de cuerpo completo', 'cuerpo_completo', 1350.00, 90, 1, 'Piedras Calientes'),
('Masaje de Spa Premium', 'Masaje premium de spa con productos especiales', 'cuerpo_completo', 1500.00, 90, 1, 'Masoterapia Premium'),
('Masaje de Vela', 'Masaje relajante con aceites de vela aromática', 'cuerpo_completo', 1500.00, 90, 1, 'Vela Aromática'),
('Masaje de Cannabis', 'Masaje terapéutico con aceite de cannabis', 'cuerpo_completo', 1500.00, 90, 1, 'Cannabis Terapéutico'),
('Masaje de Tequila', 'Masaje exfoliante y relajante con tequila', 'cuerpo_completo', 1500.00, 90, 1, 'Tequila Terapéutico'),
('Facial + Masaje Combinado', 'Tratamiento facial combinado con masaje de espalda', 'rostro', 1200.00, 120, 1, 'Tratamiento Mixto'),

-- Paquetes especiales y gift cards (como servicios especiales)
('Gift Card Arena', 'Tarjeta de regalo con depilación A o BS más regalo', 'gift_card', 700.00, 60, 1, 'Regalo'),
('Gift Card Cielo', 'Tarjeta de regalo con masaje y kit de depilación', 'gift_card', 1200.00, 120, 1, 'Regalo'),
('Gift Card Mar', 'Tarjeta de regalo con facial premium y depilación BB full', 'gift_card', 1800.00, 180, 1, 'Regalo'),

-- Paquetes de día de relax
('Día de Relax Arena', 'Masaje de vela 90 min + facial hidratante 50 min + exfoliación', 'cuerpo_completo', 2040.00, 140, 1, 'Paquete Spa'),
('Día de Relax Cielo', 'Masaje cannabis 90 min + facial profundo 60 min + armonización', 'cuerpo_completo', 2295.00, 150, 1, 'Paquete Spa'),
('Día de Relax Mar', 'Masaje tequila 90 min + facial regenerante 60 min + gelish + parafina', 'cuerpo_completo', 3156.00, 210, 1, 'Paquete Spa Premium')

ON CONFLICT (nombre) DO NOTHING;

-- Actualizar servicios existentes que puedan tener conflictos o mejoras
UPDATE services SET 
  descripcion = 'Depilación láser de axilas con tecnología Sopranoice',
  duracion_minutos = 30,
  sesiones_recomendadas = 10
WHERE zona = 'axilas' AND nombre LIKE '%Depilación Láser%';

UPDATE services SET 
  descripcion = 'Depilación láser de piernas completas con tecnología Sopranoice',
  duracion_minutos = 90,
  sesiones_recomendadas = 12
WHERE zona = 'piernas' AND nombre LIKE '%Depilación Láser%';

-- Crear índices adicionales para mejor rendimiento en búsquedas
CREATE INDEX IF NOT EXISTS idx_services_nombre_zona ON services(nombre, zona);
CREATE INDEX IF NOT EXISTS idx_services_precio ON services(precio_base);
CREATE INDEX IF NOT EXISTS idx_services_tecnologia ON services(tecnologia);

-- Insertar categorías de servicios adicionales si no existen
INSERT INTO services (nombre, descripcion, zona, precio_base, duracion_minutos, sesiones_recomendadas, tecnologia) VALUES
('Consulta Inicial', 'Evaluación inicial de la piel y diseño de tratamiento personalizado', 'consulta', 0.00, 30, 1, 'Consulta'),
('Prueba de Parche', 'Prueba de sensibilidad en zona pequeña antes del tratamiento', 'prueba', 0.00, 15, 1, 'Evaluación'),
('Mantenimiento Post-Tratamiento', 'Sesión de mantenimiento después de completar el tratamiento', 'mantenimiento', 500.00, 30, 1, 'Sopranoice')
ON CONFLICT (nombre) DO NOTHING;

-- Comentarios sobre el mapeo de datos:
/*
MAPEO DE ZONAS:
- ROSTRO -> rostro
- AXILAS -> axilas  
- GLUTEOS -> gluteos
- ESPALDA -> espalda
- INGLES/ENTRE PIERNA -> ingles
- ESCOTE -> escote
- BRAZOS -> brazos
- PIERNAS -> piernas
- UÑAS -> uñas
- CUERPO COMPLETO -> cuerpo_completo

MAPEO DE PRECIOS:
- Se usó PRECIO REGULAR como precio_base cuando estaba disponible
- Para servicios con packs, se calculó un precio promedio
- Los precios están en pesos mexicanos

MAPEO DE DURACIONES:
- Estimadas basadas en el tipo de tratamiento y complejidad
- Servicios faciales: 30-90 minutos
- Masajes: 60-90 minutos
- Tratamientos complejos: 90-150 minutos

MAPEO DE SESIONES RECOMENDADAS:
- Basado en los packs disponibles (X3, X5, X10)
- Tratamientos únicos: 1 sesión
- Tratamientos correctivos: 3-5 sesiones
- Tratamientos de mantenimiento: 5-10 sesiones
*/