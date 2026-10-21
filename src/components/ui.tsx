import type { ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  CalendarDays,
} from "lucide-react";
export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <div className="notice error" role="alert">
          <AlertCircle size={19} />
          {error}
        </div>
      )}
      {success && (
        <div className="notice success" role="status">
          <CheckCircle2 size={19} />
          {success}
        </div>
      )}
    </>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Cargando…
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <CalendarDays size={30} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Submit({
  busy,
  disabled = false,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button className="button" disabled={busy || disabled} type="submit">
      {busy ? (
        <>
          <LoaderCircle className="spin" size={17} />
          Procesando…
        </>
      ) : (
        children
      )}
    </button>
  );
}
