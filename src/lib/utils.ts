export const TIMEZONE = "America/Mazatlan";
export function clinicDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
export function money(value: number | null) {
  return value == null
    ? "Consultar precio"
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(value);
}
export const statusLabel = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Realizada",
  cancelled: "Cancelada",
};
export function errorMessage(error: unknown): string {
  const e = error as { message?: string; code?: string };
  if (e?.code === "23505" || e?.code === "23P01")
    return "Ese horario o registro ya existe. Actualice la disponibilidad e inténtelo de nuevo.";
  if (e?.message?.includes("Invalid login credentials"))
    return "El correo o la contraseña no son correctos.";
  if (e?.message?.includes("Email not confirmed"))
    return "Confirme su correo electrónico antes de ingresar.";
  if (e?.message?.includes("fetch") || e?.message?.includes("network"))
    return "No fue posible conectar. Compruebe su conexión e inténtelo de nuevo.";
  return e?.message || "No fue posible completar la operación.";
}
export function validatePassword(password: string) {
  return password.length >= 12;
}
export function isWeekday(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day > 0 && day < 6;
}
