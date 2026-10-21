# XPRECION · 

Reconstrucción de `Xprecion2.0` con React, TypeScript, Vite, Capacitor y Supabase. La web y los proyectos móviles comparten interfaz y reglas de negocio. No requiere PHP ni MySQL para la nueva aplicación.

**Estado de entrega:** aplicación y proyectos nativos implementados; compilación web y reglas de PostgreSQL verificadas localmente. Falta conectar un proyecto real de Supabase, configurar la clínica, publicar la web y compilar/firmar las aplicaciones móviles. No contiene credenciales, pacientes, médicos ni citas reales. No se ha migrado ninguna base de datos anterior.

## Qué incluye

| Área                     | Funcionalidades                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Sitio público            | Inicio, estudios consultados desde la base de datos, contacto de la clínica y preparación por estudio.                         |
| Cuenta                   | Registro por correo, confirmación, inicio/cierre de sesión, recuperación de contraseña y perfil con `username`.                |
| Pacientes                | Disponibilidad, solicitud y cancelación de citas, historial, resultados PDF privados y comentarios.                            |
| Recepción (`staff`)      | Agenda paginada, confirmación/cancelación/finalización, consulta de pacientes, publicación/retiro de resultados y comentarios. |
| Administración (`admin`) | Lo anterior, más áreas, estudios, precios, médicos, horarios semanales y datos públicos de contacto.                           |
| Backend                  | PostgreSQL, Supabase Auth, RLS, funciones transaccionales, almacenamiento privado y registro de cambios de citas/resultados.   |
| Móvil                    | Proyectos Android e iOS de Capacitor; interfaz adaptable y navegación inferior para pacientes.                                 |

## Ejecutar la web

Para usarla exclusivamente en esta computadora, consulte [la guía de despliegue local y campos de Supabase](docs/DESPLIEGUE_LOCAL_SUPABASE.md). Incluye configuración de autenticación, diccionario de las 10 tablas y `Caddyfile.local` para servir el build en loopback.

Requiere Node.js 22.12 o posterior y npm.

```bash
npm ci
cp .env.example .env
# Completar las variables públicas de su proyecto.
npm run dev
```

En Windows, `copy .env.example .env` sustituye a `cp`. Abra `http://localhost:5173`.

```dotenv
VITE_SUPABASE_URL=https://SU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SU_CLAVE_PUBLICA
VITE_PUBLIC_SITE_URL=http://localhost:5173
```

La clave debe ser **publishable** o la antigua **anon**, nunca `service_role`, `sb_secret_…`, una contraseña de base de datos ni un token personal. Las variables `VITE_*` quedan incorporadas en el cliente. Las autorizaciones se aplican en PostgreSQL mediante RLS y funciones, no mediante secretos en el navegador.

Sin variables válidas se muestra una vista previa explícita: no se simulan usuarios, citas ni resultados.

## Preparar Supabase

Utilice inicialmente un proyecto vacío/de desarrollo. Las migraciones crean tablas y funciones con nombres propios; no deben aplicarse a una base existente sin revisar conflictos.

1. En SQL Editor ejecute, en este orden:
   - `supabase/migrations/202610040001_initial.sql`
   - `supabase/migrations/202610040002_catalog.sql`
2. En Authentication → URL Configuration establezca **Site URL** y permita la URL raíz exacta de la web como redirect. Para desarrollo: `http://localhost:5173/`.
3. Active autenticación por correo y confirmación del correo. Configure mínimo 12 caracteres y un proveedor SMTP para correos en producción.
4. Registre y confirme la cuenta de quien administrará la clínica.
5. Promueva exclusivamente esa cuenta desde SQL Editor, usando su UUID verificado:

```sql
select id, email from auth.users where email = 'correo-real-del-administrador';
-- Sustituir el UUID siguiente con el resultado verificado.
update public.profiles set role = 'admin'
where id = 'UUID-REAL-DEL-ADMINISTRADOR';
```

No se puede modificar `role` desde la aplicación. Para recepción, el propietario del proyecto asigna `staff` de la misma manera. Ni siquiera el administrador del frontend dispone de un endpoint para otorgar roles.

6. Cierre sesión y vuelva a ingresar. En Administración configure médicos, áreas, precios, preparación y horarios. El catálogo inicial contiene 16 estudios sin precios ficticios.
7. Publique teléfono, dirección y correo. Sustituya el texto provisional de privacidad por el aviso aprobado de la clínica antes de abrir el registro al público.
8. Complete la aceptación funcional descrita en `docs/VALIDACION.md`.

Alternativa con Supabase CLI y Docker: `supabase start`, `supabase db reset`. Para remoto, tras revisar el proyecto destino: `supabase link --project-ref SU_REFERENCIA` y `supabase db push`. `supabase/config.toml` configura el entorno local; SMTP, redirects y autenticación del proyecto alojado deben revisarse en ese proyecto.

## Publicar la web

```bash
npm run build
npm run preview
```

Publique **solo `dist/`** en un alojamiento HTTPS. Se incluyen configuraciones para Netlify y Vercel con fallback de rutas a `index.html`. Configure las tres variables públicas antes de compilar. Cambiar `.env` después de compilar no cambia el paquete generado.

No publique la raíz del repositorio, `legacy/`, las pruebas ni los scripts. El backend antiguo no forma parte de `dist/`.

## Aplicaciones móviles

Los directorios `android/` e `ios/` ya están generados. Capacitor incluye los archivos de la web en los proyectos nativos; no se limita a enlazar una URL remota.

```bash
npm ci
# Configurar .env con Supabase y la URL HTTPS pública de la web.
npm run mobile:sync
npm run mobile:android
```

En Android Studio instale el SDK que requiere `android/variables.gradle` y use el JDK requerido por la versión de Gradle/Capacitor. Pruebe en dispositivo o emulador. Para distribución, genere y firme APK/AAB con su propia clave.

En macOS con Xcode:

```bash
npm run mobile:sync
npm run mobile:ios
```

Seleccione su equipo de firma, ajuste el identificador si procede y pruebe en simulador/dispositivo. iOS usa Swift Package Manager. La publicación requiere sus cuentas de las tiendas. No se incluyen APK/IPA firmados ni una prueba nativa real en esta entrega.

**Confirmación y recuperación:** los correos abren la web HTTPS definida en `VITE_PUBLIC_SITE_URL`. Confirme o restablezca allí y luego ingrese en la aplicación. No se han configurado universal links ni apertura automática de la app desde esos correos.

## Reglas de agenda

- Zona horaria única: `America/Mazatlan`. La fecha de nacimiento es una fecha civil, sin conversión horaria.
- Lunes a viernes, hasta 180 días hacia adelante; no se permiten fechas u horas pasadas.
- Un bloque administrativo fijo de 30 minutos por cita. Apertura/cierre alineados a `:00` o `:30`; un intervalo por médico y día.
- El estudio y el médico deben pertenecer a la misma área activa.
- Se exige fecha de nacimiento y teléfono antes de reservar.
- No se admite el mismo médico o paciente en dos citas activas del mismo bloque. Las restricciones únicas y la función transaccional aplican aunque el cliente sea manipulado.
- Estados: pendiente → confirmada → realizada; pendientes/confirmadas se pueden cancelar. No se reactiva una cita cancelada. El paciente cancela antes de su inicio; recepción puede cancelar pendientes/confirmadas pasadas. Finalizar exige haber terminado el turno.
- Cambiar horarios o desactivar un médico no elimina las citas existentes. Recepción debe gestionar las afectadas.

Para estudios con diferente duración, recursos compartidos, múltiples sedes, feriados o descansos intermedios se debe ampliar el modelo de agenda antes de utilizarlos. No se han inventado esas reglas operativas.

## Datos y seguridad

- Cada paciente solo consulta su perfil, citas, resultados y comentarios. Personal autorizado accede a los datos necesarios para operación.
- Documentos PDF hasta 10 MB; bucket `results` privado, RLS por titular y enlaces de 60 segundos. El cliente verifica encabezado PDF y el bucket restringe MIME/tamaño; no hay análisis antivirus implementado.
- Citas solo se modifican mediante RPC; el frontend no tiene permisos de inserción o actualización directos en esa tabla.
- La migración de usuarios MySQL necesita un procedimiento separado; no copie contraseñas ni hashes a tablas públicas. Este repositorio no incluye un volcado de la base anterior.
- Auditoría de inserción/actualización de citas y publicación/retiro de resultados; no es una auditoría completa de accesos o descargas.
- En Android se deshabilitan backups de la aplicación y tráfico HTTP sin cifrar. Las sesiones persisten mediante el almacenamiento del cliente de Supabase; cierre sesión en dispositivos compartidos.
- No se incluyen pagos, notificaciones push, integración PACS/DICOM, interpretación médica automática ni expediente clínico completo.

## Verificación

```bash
npm run build
npm test
npm run test:db
npx playwright install chromium
npm run test:e2e
npm run test:integration
```

Las pruebas SQL ejecutan las migraciones reales sobre PostgreSQL WASM (PGlite), con esquemas mínimos de Auth y Storage. Validan restricciones, RLS, roles y funciones, pero no sustituyen las pruebas del servicio remoto, SMTP, Storage HTTP ni las pruebas nativas. Las pruebas públicas usan el modo sin conexión. Las pruebas de contrato HTTP utilizan respuestas simuladas para verificar reservas, perfil y administración. Ninguna necesita credenciales reales. CI ejecuta las mismas comprobaciones.

## Organización

```text
src/components/       Elementos comunes y navegación
src/pages/            Sitio público, acceso, pacientes y administración
src/lib/              Cliente Supabase, sesión, tipos y utilidades
supabase/migrations/  Esquema, permisos, funciones y catálogo
android/              Proyecto Android
ios/                  Proyecto iOS
tests/                Pruebas de utilidades y navegador
scripts/              Verificación real de reglas SQL con PGlite
docs/                 Arquitectura, validación y diagnóstico de origen
legacy/               Código original conservado; no desplegar
```

Fuentes técnicas oficiales: [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage/security/access-control), [Capacitor](https://capacitorjs.com/docs).
