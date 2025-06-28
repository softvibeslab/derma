# Sistema de Gestión Dermacielo

Sistema integral de gestión para clínicas de depilación láser con tecnología Sopranoice.

## Características Principales

- 🏥 **Gestión de Pacientes**: Expedientes completos con historial de tratamientos
- 📅 **Sistema de Citas**: Calendario visual con programación automática
- 💳 **Punto de Venta**: POS integrado con múltiples métodos de pago
- 📊 **Reportes**: Dashboard con estadísticas en tiempo real
- 👥 **Control de Usuarios**: Roles diferenciados (Administrador, Cajero, Cosmetóloga)
- 📥 **Importación**: Migración desde archivos Excel existentes
- 🔒 **Seguridad**: Autenticación JWT y políticas de acceso

## Tecnologías

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Gráficos**: Recharts
- **Iconos**: Lucide React

## Instalación

1. Clona el repositorio:
```bash
git clone [repository-url]
cd dermacielo-management-system
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env.local
```

4. Edita `.env.local` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-api-key-aqui
```

5. Ejecuta la aplicación:
```bash
npm run dev
```

## Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta el script SQL de la documentación para crear las tablas
3. Configura las políticas de Row Level Security (RLS)
4. Obtén tu URL y API Key del proyecto

## Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
├── contexts/           # Contextos de React
├── lib/               # Configuración de librerías
├── pages/             # Páginas principales
└── App.tsx            # Componente principal
```

## Funcionalidades por Rol

### Administrador
- Acceso completo al sistema
- Gestión de usuarios y servicios
- Reportes avanzados
- Configuración del sistema

### Cajero
- Gestión de pacientes
- Programación de citas
- Procesamiento de pagos
- Punto de venta

### Cosmetóloga
- Consulta de pacientes
- Gestión de citas asignadas
- Actualización de expedientes
- Seguimiento de tratamientos

## Servicios Disponibles

- Depilación Láser Axilas
- Depilación Láser Bikini Brasileño
- Depilación Láser Bikini Full
- Depilación Láser Piernas
- Depilación Láser Ingles
- Y más zonas corporales...

## Métodos de Pago

- Efectivo
- Transferencia bancaria
- Terminal BBVA
- Terminal Clip

## Soporte

Para soporte técnico o consultas, contacta al administrador del sistema.

---

**Dermacielo** - Sistema desarrollado con tecnología Sopranoice para depilación láser profesional.