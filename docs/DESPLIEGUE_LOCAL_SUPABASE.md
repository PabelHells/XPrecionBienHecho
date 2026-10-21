# XPRECION en esta computadora con Supabase

## Arquitectura y alcance

La aplicación ejecutable está en `XPRECION/`: React, TypeScript y Vite. `legacy/` conserva la versión PHP anterior y no debe servirse. No necesita XAMPP, PHP ni MySQL. Android e iOS son proyectos separados para empaquetar la misma web.

La computadora sirve la interfaz y Supabase remoto proporciona PostgreSQL, autenticación y PDF privados. Se requiere Internet para esas funciones. Esta guía usa exclusivamente `127.0.0.1`; no requiere abrir el firewall ni puertos del router. El navegador de otro dispositivo no podrá acceder.

## 1. Preparar Supabase

Utilizar un proyecto vacío. Si ya contiene tablas o usuarios, revisar primero: estas migraciones no son idempotentes y no hacen una migración de datos anteriores.

En SQL Editor ejecutar completos, una sola vez y en este orden:

**Opción de un solo archivo:** ejecutar `supabase/INSTALAR_SUPABASE.sql`. Contiene ambas migraciones dentro de una sola transacción. Si eliges esta opción, no ejecutes también los dos archivos siguientes.

1. `supabase/migrations/202610040001_initial.sql`
2. `supabase/migrations/202610040002_catalog.sql`

La primera crea las 10 tablas, relaciones, índices, triggers, funciones, permisos RLS y bucket. La segunda agrega 4 áreas y 16 estudios. No crear las tablas manualmente antes ni ejecutar las migraciones repetidamente. Si falla una, conservar el error y revisar el estado antes de volver a intentar; la segunda no está envuelta en una transacción explícita.

En el panel del proyecto:

| Configuración | Valor |
| --- | --- |
| Data API | Habilitada; esquema `public` expuesto |
| Esquema privado | No exponer `app_private` en Data API |
| Authentication / proveedor Email | Habilitado; permitir nuevos registros |
| Confirmación de correo | Habilitada |
| Longitud mínima de contraseña | 12 |
| Authentication / URL Configuration / Site URL | `http://127.0.0.1:5173` |
| Redirect URLs | `http://127.0.0.1:5173/` |
| SMTP | Host, puerto, usuario, contraseña y remitente verificado de tu proveedor |
| Storage / bucket `results` | Privado; máximo `10485760` bytes; MIME `application/pdf` |
| RLS | Mantener habilitado en las 10 tablas; las migraciones ya crean las políticas |

El servicio SMTP predeterminado tiene restricciones de destinatarios y envío; configurar SMTP propio para registrar usuarios fuera del equipo autorizado del proyecto. Los correos de confirmación y recuperación de este entorno deben abrirse en esta misma computadora.

No hace falta activar Realtime, crear Edge Functions ni configurar Google OAuth para el código actual. `supabase/config.toml` configura Supabase CLI local, no el proyecto alojado.

## 2. Variables y ejecución local

En PowerShell:

```powershell
Set-Location 'C:\Users\pabel\Downloads\XPRECION-web-movil-supabase\XPRECION'
npm ci
Copy-Item .env.example .env
```

Copiar el ejemplo solo si todavía no existe `.env`. Editarlo así, sustituyendo los dos valores del proyecto:

```dotenv
VITE_SUPABASE_URL=https://TU_REFERENCIA.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE_PUBLICA
VITE_PUBLIC_SITE_URL=http://127.0.0.1:5173
```

La URL y clave pública están en Connect o Settings / API Keys. Nunca poner `service_role`, `sb_secret_...`, contraseña PostgreSQL ni tokens personales en variables `VITE_*`: se incluyen en el navegador.

Para trabajar y probar:

```powershell
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Mantener la terminal abierta; Ctrl+C detiene el proceso. `--strictPort` evita cambiar de puerto silenciosamente y romper las URLs de los correos.

Para comprobar la versión compilada, detener primero el servidor anterior:

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

Preview sirve para comprobar el build; Vite no lo recomienda como servidor de producción permanente. Cambiar `.env` exige reiniciar desarrollo o volver a compilar el build.

Para un servidor estático permanente en esta PC, se incluye `Caddyfile.local`. Después de instalar Caddy desde su sitio oficial, ejecutar desde `XPRECION/`:

```powershell
npm run build
caddy validate --config Caddyfile.local --adapter caddyfile
caddy run --config Caddyfile.local --adapter caddyfile
```

No ejecutar Vite y Caddy al mismo tiempo en el puerto 5173. Caddy sirve solo `dist/` y resuelve las rutas React mediante `index.html`. La instalación de Caddy y su inicio automático no se han realizado; el proceso manual termina al cerrarlo. El PC debe permanecer encendido y sin suspensión mientras se use la web.

## 3. Parámetros de cada tabla

Estos son los campos reales del SQL, no un esquema alternativo. `uuid` identifica registros; una referencia debe contener un ID existente. Los campos con valor automático se dejan sin rellenar al crear registros desde la aplicación. Salvo donde se indica NULL, las columnas son obligatorias aunque algunas tengan un valor predeterminado.

### profiles — cuentas de pacientes y personal

| Campo | Tipo y regla | Qué poner |
| --- | --- | --- |
| id | uuid, PK, referencia a `auth.users.id`; borrado en cascada | Automático al registrarse |
| username | text, 3–40 caracteres; único ignorando mayúsculas | Usuario elegido; la interfaz admite letras, números y `_` |
| full_name | text, 2–150 caracteres | Nombre real |
| birth_date | date, NULL permitido, no futura | `AAAA-MM-DD`; requerida para reservar |
| phone | text, máximo 30; predeterminado vacío | Teléfono; al menos 7 caracteres para reservar |
| address | text, máximo 500; predeterminado vacío | Dirección |
| role | text, predeterminado `patient` | `patient`, `staff` o `admin`; asignar personal por SQL |
| created_at | timestamptz, `now()` | Automático |

No guardar contraseñas o correo aquí: los administra Supabase Auth. Registrar cuentas desde la web después de aplicar las migraciones; el trigger crea el perfil. Cuentas existentes antes de la migración no reciben perfil retroactivamente.

### clinic_settings — configuración pública, una sola fila

| Campo | Tipo / valor | Qué poner |
| --- | --- | --- |
| id | boolean PK, solo `true` | Mantener la fila creada por SQL |
| name | text, predeterminado `XPRECION` | Nombre de clínica |
| phone | text, predeterminado vacío | Teléfono público |
| address | text, predeterminado vacío | Dirección pública |
| email | text, predeterminado vacío | Correo público de contacto |
| timezone | text, solo `America/Mazatlan` | Mantener ese valor |

La zona horaria también está fijada en funciones y frontend. No cambiar solo esta fila esperando cambiar toda la agenda.

### areas — áreas del catálogo

| Campo | Tipo / regla | Qué poner |
| --- | --- | --- |
| id | uuid PK, `gen_random_uuid()` | Automático |
| name | text único, 2–100 caracteres | La migración agrega Tomografía, Ultrasonido, Biopsias y Radiología |
| active | boolean, `true` | Activar o desactivar |

### services — estudios

| Campo | Tipo / regla | Qué poner |
| --- | --- | --- |
| id | uuid PK, automático | No rellenar |
| area_id | uuid FK a `areas.id` | Seleccionar área correspondiente |
| name | text único, 2–150 caracteres | Nombre del estudio |
| description | text, vacío por defecto | Descripción pública |
| preparation | text, vacío por defecto | Indicaciones revisadas por la clínica |
| price | numeric(10,2), >= 0, NULL permitido | Precio real; NULL si está por definir; cero significa precio cero |
| active | boolean, `true` | Si se ofrece el estudio |

Los 16 estudios iniciales no tienen precios ni preparación configurados. La interfaz presenta precios en MXN.

### doctors — médicos

| Campo | Tipo / regla | Qué poner |
| --- | --- | --- |
| id | uuid PK, automático | No rellenar |
| area_id | uuid FK a `areas.id` | Área del médico |
| name | text, 2–150 caracteres | Nombre real |
| active | boolean, `true` | Si puede recibir nuevas reservas |

No hay médicos iniciales. Cada médico pertenece a una sola área en esta versión. Un registro aquí no crea una cuenta para iniciar sesión.

### schedules — horarios semanales

| Campo | Tipo / regla | Qué poner |
| --- | --- | --- |
| id | uuid PK, automático | No rellenar |
| doctor_id | uuid FK a `doctors.id` | Médico correspondiente |
| weekday | integer, 1–5 | 1 lunes, 2 martes, 3 miércoles, 4 jueves, 5 viernes |
| opens_at | time | Por ejemplo `09:00:00`, únicamente minutos 00 o 30 y segundos 00 |
| closes_at | time, mayor que apertura | Por ejemplo `17:00:00`, misma alineación |

Solo una fila por médico y día. Para lunes a viernes crear cinco filas. No hay sábado/domingo, descansos intermedios ni feriados configurables en el modelo actual. Las horas de ejemplo no son horarios reales de la clínica.

### appointments — citas, creadas por la aplicación

| Campo | Tipo / regla | Origen |
| --- | --- | --- |
| id | uuid PK, automático | Sistema |
| patient_id | uuid FK a `profiles.id` | Usuario que reserva |
| service_id | uuid FK a `services.id` | Estudio seleccionado |
| doctor_id | uuid FK a `doctors.id` | Médico seleccionado, misma área del estudio |
| starts_at | timestamptz | Turno disponible; se almacena un instante y se muestra en Mazatlán |
| ends_at | timestamptz | Inicio + exactamente 30 minutos |
| status | text, `pending` por defecto | `pending`, `confirmed`, `completed`, `cancelled` |
| notes | text, máximo 1000; vacío por defecto | Nota de reserva |
| created_at | timestamptz, `now()` | Automático |

No insertar manualmente: usar `book_appointment`. Actualizaciones mediante `cancel_appointment` y `set_appointment_status`. SQL Editor tiene privilegios elevados y puede saltarse reglas que sí se aplican a la aplicación. La disponibilidad permite hasta 180 días y evita dos citas no canceladas del mismo médico o paciente en el mismo bloque.

### results — metadatos de resultados privados

| Campo | Tipo / regla | Origen |
| --- | --- | --- |
| id | uuid PK, automático | Sistema |
| appointment_id | uuid | Cita correspondiente |
| patient_id | uuid | Paciente de esa misma cita; FK compuesta lo verifica |
| title | text, 2–150 caracteres | Título indicado por recepción |
| file_path | text único | `UUID_PACIENTE/UUID_ARCHIVO.pdf`, generado por la app |
| created_at | timestamptz, `now()` | Automático |

Subir desde Administración: la app carga el PDF al bucket privado `results` y crea esta fila. No poner URLs públicas en `file_path` ni documentos binarios en la tabla. El enlace de lectura dura 60 segundos.

### feedback — comentarios

| Campo | Tipo / regla | Origen |
| --- | --- | --- |
| id | uuid PK, automático | Sistema |
| patient_id | uuid FK a `profiles.id` | Usuario autenticado |
| message | text, 10–3000 caracteres | Mensaje del usuario |
| resolved | boolean, `false` | Personal lo marca atendido |
| created_at | timestamptz, `now()` | Automático |

### audit_log — auditoría automática

| Campo | Tipo / regla | Origen |
| --- | --- | --- |
| id | bigint, identity PK | Automático |
| actor_id | uuid, NULL permitido | `auth.uid()`; puede ser NULL en operaciones del SQL Editor |
| entity | text | Tabla afectada |
| entity_id | text | Identificador afectado |
| action | text | Operación del trigger: INSERT, UPDATE o DELETE según tabla |
| created_at | timestamptz, `now()` | Automático |

No capturar filas manualmente. Registra inserción/actualización de citas e inserción/eliminación de resultados; no todas las lecturas ni descargas. Solo admin puede consultar desde el API.

`auth.users`, `storage.buckets` y `storage.objects` son tablas administradas por Supabase. No recrearlas. El SQL configura el bucket y sus políticas.

## 4. Crear el primer administrador

Registrar y confirmar tu cuenta desde la web. Buscarla en SQL Editor:

```sql
select id, email from auth.users
where email = 'TU_CORREO_REAL';
```

Verificar que sea tu cuenta y copiar su UUID:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID_VERIFICADO'
returning id, username, role;
```

Debe devolver una fila. Cerrar sesión y volver a entrar; abrir `/administracion`. Para recepción se utiliza `staff` en lugar de `admin`, siempre sobre la cuenta verificada. El frontend no permite otorgar roles.

Configurar en este orden: datos de clínica, áreas, estudios/precios/preparación, médicos, horarios. No precargar pacientes, citas, resultados ni auditoría: los generan los flujos normales.

## 5. Verificación antes de usar datos reales

```sql
select name, phone, address, email, timezone from public.clinic_settings;
select count(*) as areas from public.areas;
select count(*) as estudios from public.services;
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename in ('profiles','clinic_settings','areas','services','doctors',
'schedules','appointments','results','feedback','audit_log');
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'results';
```

En una instalación recién creada: 4 áreas, 16 estudios, 10 tablas con RLS y bucket privado de PDF. Probar registro, correo, recuperación, perfil, reserva, confirmación y carga de PDF usando dos cuentas de pacientes para comprobar aislamiento. Ver `VALIDACION.md` para la aceptación completa. Reemplazar el aviso de privacidad provisional antes de abrir registros reales.

## Referencias oficiales

- [Variables de Vite](https://vite.dev/guide/env-and-mode)
- [Build y limitación de preview](https://vite.dev/guide/static-deploy.html)
- [Claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
- [URLs de autenticación](https://supabase.com/docs/guides/auth/redirect-urls)
- [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Servidor estático Caddy](https://caddyserver.com/docs/quick-starts/static-files)
- [Fallback de rutas Caddy](https://caddyserver.com/docs/caddyfile/directives/try_files)
