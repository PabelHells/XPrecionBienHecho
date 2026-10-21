# Arquitectura y decisiones

La versión anterior consistía en páginas HTML, estilos independientes y archivos PHP. Esta reconstrucción conserva la fuente en `legacy/` y sustituye la aplicación ejecutable por un cliente tipado que se compila para navegador y Capacitor.

## Responsabilidades

| Componente         | Responsabilidad                                                |
| ------------------ | -------------------------------------------------------------- |
| React + TypeScript | Vistas, formularios, navegación y estados de carga/error.      |
| Supabase Auth      | Identidad, sesiones, confirmación de correo y recuperación.    |
| PostgreSQL         | Integridad, autorización por filas y reservas transaccionales. |
| Supabase Storage   | Documentos privados con autorización y enlaces temporales.     |
| Capacitor          | Empaquetado de la misma interfaz para Android/iOS.             |

El cliente no decide quién puede leer o modificar datos: sus controles visuales acompañan a los permisos de la base. Los roles provienen de `profiles.role`, nunca de metadatos enviados durante el registro. El trigger de registro ignora cualquier rol recibido del usuario y siempre crea un paciente.

## Modelo

- `profiles`: relación uno a uno con `auth.users`; conserva `username`, nombre, nacimiento y contacto.
- `areas`: agrupa estudios y médicos. Un médico pertenece a un área en esta versión.
- `services`: nombre, descripción, preparación, precio opcional y disponibilidad.
- `doctors`: profesionales configurados por el administrador.
- `schedules`: un intervalo por médico y día hábil.
- `appointments`: paciente, estudio, médico, bloque horario, estado y nota administrativa.
- `results`: metadatos del PDF vinculados al paciente de la cita mediante FK compuesta.
- `feedback`: comentarios del usuario; solo personal cambia su estado de atención.
- `clinic_settings`: contacto público; zona horaria fija.
- `audit_log`: actor, entidad, identificador, operación y fecha; no duplica contenido clínico.

## Límite de confianza

Las funciones `book_appointment`, `cancel_appointment` y `set_appointment_status` utilizan `security definer` con `search_path` vacío y referencias cualificadas. Su ejecución se limita a `authenticated`; validan la identidad y las reglas internamente. `available_slots` revela horarios, no nombres de pacientes. Las restricciones únicas impiden duplicados incluso bajo concurrencia; el bloqueo del médico serializa solicitudes para sus turnos.

Los privilegios de columna en `profiles` excluyen `role` e `id`. Las funciones auxiliares residen en `app_private`, fuera del esquema público del API. Los resultados se autorizan mediante la metadata asociada al dueño; conocer un nombre de archivo no otorga acceso. Al retirar un resultado se elimina primero su metadata para revocar nuevas lecturas, y luego el objeto. Un enlace firmado previamente puede permanecer válido hasta su vencimiento.

## Decisiones explícitas

- Correo y contraseña para autenticación; `username` permanece como identificador de perfil, pero no se usa como contraseña ni como cookie PHP.
- Una clínica y zona de Mazatlán. No se presupone un domicilio ni un teléfono.
- Bloques de 30 minutos, sin pagos o asignación de equipos. La duración clínica real debe revisarse con la clínica.
- Se comparte React entre plataformas. No hay un segundo frontend Flutter ni reglas duplicadas.
- No se usa almacenamiento offline para resultados o datos médicos; operaciones de backend necesitan internet.
- No hay migración de datos MySQL porque no se proporcionó un respaldo ni acceso al servidor anterior.

## Auditoría del punto de partida

Revisión sobre commit de origen `086f3b9`:

- `citas.html` y `xpre.html` mantienen datos en arreglos JavaScript que se pierden al recargar.
- `register.html` envía a `register_user.php` desde la raíz, mientras el archivo está bajo `php/`.
- `login.html` reenvía el formulario a sí misma y no integra un flujo de sesión consistente.
- `php/loginforms.php` hace referencia a `dashboard.html`, ausente en el repositorio revisado.
- `php/index.php` y `php/indexform.php` contienen una sentencia INSERT incompleta.
- `php/citas.php` y `php/register_user.php` están vacíos en ese commit.
- No se encontraron migraciones SQL, manifiesto de dependencias ni proyecto móvil.

La fuente antigua se conserva sin utilizarla como backend del nuevo sistema. El historial Git permite recuperar también su estructura original.
