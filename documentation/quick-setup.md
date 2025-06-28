# Configuración Rápida - Solución de Errores de Login

## Error: "Invalid login credentials"

Si ves este error, sigue estos pasos **en orden**:

### 1. Crear Usuarios de Prueba en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Users**
4. Haz clic en **"Add user"**
5. Crea estos 3 usuarios:

**Usuario Administrador:**
- Email: `admin@dermacielo.com`
- Password: `admin123`
- ✅ Confirma que el usuario aparezca en la lista

**Usuario Cajero:**
- Email: `cajero@dermacielo.com`
- Password: `cajero123`
- ✅ Confirma que el usuario aparezca en la lista

**Usuario Cosmetóloga:**
- Email: `cosmetologa@dermacielo.com`
- Password: `cosmetologa123`
- ✅ Confirma que el usuario aparezca en la lista

### 2. Desactivar Confirmaciones por Email

1. En tu proyecto de Supabase, ve a **Authentication** > **Settings**
2. Busca **"Enable email confirmations"**
3. **DESACTIVA** esta opción (debe estar en OFF/False)
4. Guarda los cambios

### 3. Verificar Variables de Entorno

1. En tu proyecto, verifica que existe el archivo `.env`
2. Debe contener:
```env
VITE_SUPABASE_URL=tu_url_de_proyecto_aqui
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

3. Para obtener estos valores:
   - Ve a **Settings** > **API** en tu dashboard de Supabase
   - Copia **Project URL** → `VITE_SUPABASE_URL`
   - Copia **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 4. Reiniciar el Servidor

1. En tu terminal, presiona `Ctrl+C` para detener el servidor
2. Ejecuta `npm run dev` para reiniciarlo
3. Ve a la página de login
4. Usa las credenciales de prueba

## Verificación Rápida

✅ **Usuarios creados** en Authentication > Users  
✅ **Email confirmations desactivado** en Authentication > Settings  
✅ **Variables de entorno correctas** en archivo `.env`  
✅ **Servidor reiniciado** después de cambios  

## Credenciales de Prueba

- **Admin**: `admin@dermacielo.com` / `admin123`
- **Cajero**: `cajero@dermacielo.com` / `cajero123`
- **Cosmetóloga**: `cosmetologa@dermacielo.com` / `cosmetologa123`

## ¿Aún tienes problemas?

1. Verifica que tu proyecto de Supabase esté activo
2. Revisa la consola del navegador para errores adicionales
3. Confirma que las migraciones de base de datos se ejecutaron correctamente
4. Asegúrate de estar usando el proyecto correcto de Supabase

---

**Nota**: Este es un entorno de desarrollo. En producción, siempre activa las confirmaciones por email y usa contraseñas seguras.