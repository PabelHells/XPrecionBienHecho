# Validación de la entrega

## Comprobaciones locales

| Comprobación               | Alcance                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | TypeScript y compilación optimizada de producción.                                                                                                                                                                                                                           |
| `npm test`                 | Cuatro pruebas: fechas de Mazatlán, días hábiles, precio opcional y longitud de contraseña.                                                                                                                                                                                  |
| `npm run test:db`          | 43 comprobaciones sobre las migraciones ejecutadas en PostgreSQL WASM: roles, RLS, perfiles, reservas, duplicados, cancelación, transición de estados, documentos y auditoría.                                                                                               |
| `npm run test:e2e`         | Diez pruebas de navegador: cinco casos en escritorio y viewport móvil. Navegación pública, registro/recuperación, protección de rutas y ausencia de desbordamiento horizontal en inicio.                                                                                     |
| `npm run test:integration` | Ocho pruebas de contrato HTTP: cuatro casos en escritorio y viewport móvil. Reserva y lectura posterior, rechazo del acceso administrativo para pacientes, actualización de perfil y creación de estudio por administrador. Respuestas de Supabase simuladas explícitamente. |
| `npx cap sync`             | Copia del build web y sincronización de los proyectos Android/iOS.                                                                                                                                                                                                           |
| `npm audit --omit=dev`     | Sin vulnerabilidades reportadas en dependencias de producción durante la comprobación.                                                                                                                                                                                       |

Las pruebas de base de datos ejecutan SQL real. Los esquemas mínimos de Auth y Storage permiten verificar permisos de PostgreSQL, pero no representan todos los servicios de Supabase. Las pruebas HTTP verifican el contrato que utiliza el frontend; no afirman que un backend remoto esté configurado.

Se revisaron visualmente las capturas de la portada en escritorio y móvil. El entorno requirió un ejecutable Chromium alternativo para Playwright; se puede indicar con `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Normalmente basta `npx playwright install chromium`.

## Aceptación pendiente en el proyecto real

Realizar inicialmente con cuentas y documentos de prueba:

1. Aplicar ambas migraciones en un proyecto Supabase vacío de desarrollo.
2. Configurar SMTP, URLs permitidas y confirmación de correo.
3. Registrar, confirmar e ingresar con dos pacientes distintos; comprobar la creación automática de perfiles.
4. Asignar un administrador por SQL con UUID verificado; configurar un médico y su horario en un área del catálogo.
5. Completar fecha de nacimiento y teléfono del paciente A. Reservar un turno futuro. Consultarlo desde recepción y confirmarlo.
6. Desde el paciente B, verificar que no se puede consultar el perfil, cita ni resultado del paciente A, incluyendo solicitudes directas al API.
7. Intentar reservar el mismo turno desde dos clientes simultáneos: únicamente una operación debe completarse.
8. Publicar un PDF de prueba desde recepción y abrirlo como paciente A. Verificar la denegación con B y sin sesión, tanto en API de metadatos como en Storage.
9. Comprobar vencimiento del enlace de resultado y retiro del documento.
10. Cancelar una cita futura y comprobar que el horario vuelve a estar disponible.
11. Ejecutar recuperación de contraseña desde un correo real, cerrar sesión y entrar con la nueva contraseña. Probar también confirmación/cambio mediante la web desde un teléfono.
12. Compilar Android con su SDK/JDK y probar en dispositivo: sesión, navegación, subida/lectura de PDF y conexión. Repetir iOS en macOS/Xcode.
13. Configurar dominio HTTPS, datos operativos y aviso de privacidad aprobado antes de admitir usuarios reales.

## Límites comprobados de esta entrega

- No se conectó ni se modificó un proyecto remoto de Supabase.
- No se enviaron correos reales ni se cargaron resultados reales.
- No se compilaron APK/AAB/IPA ni se realizaron pruebas en sistemas nativos.
- La autenticación de escritura en GitHub no estaba disponible. Los cambios se conservan en la rama local `rebuild/supabase-web-mobile`; no se publicaron ni se fusionaron en `main` o `master`.
- El código anterior no contiene un respaldo de MySQL; la migración de usuarios, citas o resultados existentes queda pendiente de ese respaldo y del mapeo validado.

## Continuar desde el repositorio

Con la rama local y acceso de escritura autorizado:

```bash
git push -u origin rebuild/supabase-web-mobile
```

Revisar el cambio mediante pull request hacia la rama que el equipo use para producción. La fuente se tomó de la rama predeterminada `master`, commit `086f3b9`. No aplicar `force push` ni reemplazar el historial.
