import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarPlus, FileText, RefreshCw } from "lucide-react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { useAction, useData } from "../lib/hooks";
import {
  clinicDate,
  formatDate,
  formatTime,
  isWeekday,
  statusLabel,
} from "../lib/utils";
import type { Appointment, Doctor, Result, Service } from "../lib/types";
import {
  Empty,
  Field,
  Loading,
  Notice,
  PageTitle,
  Submit,
} from "../components/ui";

export function Appointments() {
  const { session } = useAuth();
  const action = useAction();
  const q = useData<Appointment[]>(
    () =>
      db()
        .from("appointments")
        .select("*, services(name), doctors(name)")
        .eq("patient_id", session!.user.id)
        .order("starts_at", { ascending: false }),
    [session!.user.id],
  );
  const [filter, setFilter] = useState("upcoming");
  const rows =
    q.data?.filter(
      (a) =>
        filter === "all" ||
        (new Date(a.starts_at) > new Date() && a.status !== "cancelled"),
    ) || [];
  return (
    <>
      <PageTitle
        eyebrow="MI XPRECION"
        title="Mis citas"
        action={
          <Link className="button" to="/agendar">
            <CalendarPlus size={18} />
            Agendar cita
          </Link>
        }
      >
        Consulta el estado de tus solicitudes y los detalles de cada estudio.
      </PageTitle>
      <div className="toolbar">
        <div className="segmented">
          <button
            className={filter === "upcoming" ? "selected" : ""}
            onClick={() => setFilter("upcoming")}
          >
            Próximas
          </button>
          <button
            className={filter === "all" ? "selected" : ""}
            onClick={() => setFilter("all")}
          >
            Historial completo
          </button>
        </div>
        <button className="button secondary small" onClick={q.reload}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>
      <Notice error={q.error || action.error} success={action.success} />
      {q.loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="appointment-list">
          {rows.map((a) => (
            <article className="panel appointment" key={a.id}>
              <div className="appointment-date">
                <CalendarPlus size={24} />
                <strong>{formatDate(a.starts_at)}</strong>
                <small>Hora de Mazatlán</small>
              </div>
              <div className="appointment-info">
                <span className={`badge ${a.status}`}>
                  {statusLabel[a.status]}
                </span>
                <h2>{a.services?.name || "Estudio"}</h2>
                <p>{a.doctors?.name}</p>
                {a.notes && <p className="hint">{a.notes}</p>}
                <small>Folio: {a.id.slice(0, 8).toUpperCase()}</small>
              </div>
              {["pending", "confirmed"].includes(a.status) &&
                new Date(a.starts_at) > new Date() && (
                  <button
                    className="button danger small"
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Desea cancelar esta cita? El horario quedará disponible para otros pacientes.",
                        )
                      )
                        void action.run(async () => {
                          const { error } = await db().rpc(
                            "cancel_appointment",
                            { p_id: a.id },
                          );
                          if (error) throw error;
                          q.reload();
                        }, "Cita cancelada.");
                    }}
                  >
                    Cancelar cita
                  </button>
                )}
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No hay citas en esta vista">
          Agenda un estudio para comenzar o consulta tu historial.
        </Empty>
      )}
    </>
  );
}
export function Booking() {
  const [params] = useSearchParams(),
    nav = useNavigate();
  const { profile } = useAuth();
  const action = useAction();
  const [service, setService] = useState(params.get("estudio") || ""),
    [doctor, setDoctor] = useState(""),
    [date, setDate] = useState(clinicDate()),
    [slot, setSlot] = useState(""),
    [notes, setNotes] = useState("");
  const services = useData<Service[]>(() =>
    db().from("services").select("*").eq("active", true).order("name"),
  );
  const doctors = useData<Doctor[]>(() =>
    db().from("doctors").select("*").eq("active", true).order("name"),
  );
  const selected = services.data?.find((s) => s.id === service);
  const available = useData<{ starts_at: string }[]>(
    () =>
      service && doctor && date && isWeekday(date)
        ? db().rpc("available_slots", {
            p_service: service,
            p_doctor: doctor,
            p_date: date,
          })
        : Promise.resolve({ data: [], error: null }),
    [service, doctor, date],
  );
  const complete = !!profile?.birth_date && profile.phone.length >= 7;
  async function submit(e: FormEvent) {
    e.preventDefault();
    await action.run(async () => {
      if (!slot) throw new Error("Seleccione un horario disponible.");
      const { error } = await db().rpc("book_appointment", {
        p_service: service,
        p_doctor: doctor,
        p_starts_at: slot,
        p_notes: notes,
      });
      if (error) {
        setSlot("");
        available.reload();
        throw error;
      }
      nav("/citas");
    }, "");
  }
  return (
    <>
      <PageTitle eyebrow="UN PASO HACIA TU BIENESTAR" title="Agenda tu estudio">
        Selecciona un estudio y consulta la disponibilidad real del médico.
      </PageTitle>
      {!complete && (
        <div className="notice error">
          Completa tu fecha de nacimiento y teléfono en{" "}
          <Link to="/perfil">Mi perfil</Link> antes de reservar.
        </div>
      )}
      <div className="booking-grid">
        <section className="panel">
          <form onSubmit={submit}>
            <Notice
              error={
                action.error ||
                services.error ||
                doctors.error ||
                available.error
              }
            />
            <Field label="1. Estudio">
              <select
                required
                value={service}
                onChange={(e) => {
                  setService(e.target.value);
                  setDoctor("");
                  setSlot("");
                }}
              >
                <option value="">Selecciona un estudio</option>
                {services.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="2. Médico">
              <select
                required
                value={doctor}
                onChange={(e) => {
                  setDoctor(e.target.value);
                  setSlot("");
                }}
              >
                <option value="">Selecciona un médico</option>
                {doctors.data
                  ?.filter((d) => d.area_id === selected?.area_id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </Field>
            {service &&
              !doctors.loading &&
              !doctors.data?.some((d) => d.area_id === selected?.area_id) && (
                <p className="hint">
                  Aún no hay médicos habilitados para este estudio.
                </p>
              )}
            <Field label="3. Fecha">
              <input
                type="date"
                required
                min={clinicDate()}
                max={clinicDate(new Date(Date.now() + 180 * 86400000))}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSlot("");
                }}
              />
            </Field>
            <span className="field-label">4. Horario · Mazatlán</span>
            {available.loading ? (
              <Loading />
            ) : (
              <div className="slots">
                {available.data?.map((s) => (
                  <button
                    type="button"
                    key={s.starts_at}
                    aria-pressed={slot === s.starts_at}
                    className={slot === s.starts_at ? "selected" : ""}
                    onClick={() => setSlot(s.starts_at)}
                  >
                    {formatTime(s.starts_at)}
                  </button>
                ))}
                {!available.data?.length && (
                  <p className="hint">
                    {!isWeekday(date)
                      ? "Selecciona un día de lunes a viernes."
                      : doctor
                        ? "No hay horarios disponibles para esta fecha."
                        : "Selecciona estudio, médico y fecha para consultar horarios."}
                  </p>
                )}
              </div>
            )}
            <Field label="Nota para recepción (opcional)">
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica únicamente detalles necesarios para la cita."
              />
            </Field>
            <Submit
              busy={action.busy}
              disabled={!complete || !slot || available.loading}
            >
              Solicitar cita
              <ArrowUpRight size={18} />
            </Submit>
          </form>
        </section>
        <aside className="panel booking-summary">
          <span className="eyebrow">TU SOLICITUD</span>
          <h2>{selected?.name || "Elige tu estudio"}</h2>
          <p>
            {selected?.description ||
              "La información de tu estudio aparecerá aquí."}
          </p>
          {slot && (
            <p>
              <strong>{formatDate(slot)}</strong>
            </p>
          )}
          <hr />
          <h3>Antes de tu visita</h3>
          <p>
            {selected?.preparation ||
              "Contacta a la clínica para confirmar la preparación específica de tu estudio."}
          </p>
          <p className="hint">
            La solicitud queda pendiente hasta que recepción la confirme. Podrás
            consultar su estado en Mis citas.
          </p>
          <p className="hint">
            Los turnos administrativos son de 30 minutos. La duración clínica
            del estudio puede ser diferente.
          </p>
        </aside>
      </div>
    </>
  );
}
export function Results() {
  const { session } = useAuth(),
    action = useAction();
  const [document, setDocument] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const q = useData<Result[]>(
    () =>
      db()
        .from("results")
        .select("*")
        .eq("patient_id", session!.user.id)
        .order("created_at", { ascending: false }),
    [session!.user.id],
  );
  async function open(r: Result) {
    await action.run(async () => {
      const { data, error } = await db()
        .storage.from("results")
        .createSignedUrl(r.file_path, 60);
      if (error) throw error;
      setDocument({ url: data.signedUrl, title: r.title });
    }, "");
  }
  return (
    <>
      <PageTitle eyebrow="DOCUMENTOS PRIVADOS" title="Mis resultados">
        Aquí encontrarás los documentos publicados por el personal de XPRECION.
      </PageTitle>
      <Notice error={q.error || action.error} />
      {q.loading ? (
        <Loading />
      ) : q.data?.length ? (
        <div className="cards-grid">
          {q.data.map((r) => (
            <article className="panel" key={r.id}>
              <FileText size={32} />
              <h2>{r.title}</h2>
              <p>{formatDate(r.created_at)}</p>
              <button
                className="button secondary"
                disabled={action.busy}
                onClick={() => open(r)}
              >
                Consultar PDF
                <ArrowUpRight size={17} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="Aún no tienes resultados publicados">
          Cuando el personal comparta un documento, aparecerá en este espacio.
        </Empty>
      )}
      {document && (
        <section className="panel section">
          <h2>{document.title}</h2>
          <p>
            El enlace vence en 60 segundos. Si expira, vuelve a consultar el
            documento.
          </p>
          <a
            className="button"
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir documento PDF
            <ArrowUpRight size={18} />
          </a>
          <button
            className="button secondary"
            onClick={() => setDocument(null)}
          >
            Cerrar
          </button>
        </section>
      )}
    </>
  );
}
export function ProfilePage() {
  const { profile, refresh } = useAuth();
  const action = useAction(),
    feedback = useAction();
  const [message, setMessage] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await action.run(async () => {
      const { error } = await db()
        .from("profiles")
        .update({
          username: String(form.get("username")).trim(),
          full_name: String(form.get("full_name")).trim(),
          birth_date: form.get("birth_date") || null,
          phone: String(form.get("phone")).trim(),
          address: String(form.get("address")).trim(),
        })
        .eq("id", profile!.id);
      if (error) throw error;
      await refresh();
    });
  }
  return (
    <>
      <PageTitle eyebrow="MI CUENTA" title="Mi perfil">
        Mantén tus datos actualizados para facilitar la atención.
      </PageTitle>
      <div className="two-col">
        <section className="panel">
          <h2>Datos personales</h2>
          <Notice error={action.error} success={action.success} />
          <form onSubmit={save}>
            <Field label="Nombre de usuario">
              <input
                name="username"
                required
                minLength={3}
                maxLength={40}
                defaultValue={profile?.username}
              />
            </Field>
            <Field label="Nombre completo">
              <input
                name="full_name"
                required
                minLength={2}
                maxLength={150}
                autoComplete="name"
                defaultValue={profile?.full_name}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <input
                name="birth_date"
                type="date"
                required
                max={clinicDate()}
                defaultValue={profile?.birth_date || ""}
              />
            </Field>
            <Field label="Teléfono">
              <input
                name="phone"
                required
                minLength={7}
                maxLength={30}
                type="tel"
                autoComplete="tel"
                defaultValue={profile?.phone}
              />
            </Field>
            <Field label="Dirección">
              <textarea
                name="address"
                maxLength={500}
                autoComplete="street-address"
                defaultValue={profile?.address}
              />
            </Field>
            <Submit busy={action.busy}>Guardar datos</Submit>
          </form>
        </section>
        <section className="panel">
          <h2>Buzón de comentarios</h2>
          <p>
            Comparte una sugerencia o describe un problema de atención. El
            personal autorizado podrá revisarlo.
          </p>
          <Notice error={feedback.error} success={feedback.success} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void feedback.run(async () => {
                const { error } = await db()
                  .from("feedback")
                  .insert({ patient_id: profile!.id, message });
                if (error) throw error;
                setMessage("");
              }, "Su comentario fue enviado.");
            }}
          >
            <Field label="Comentario">
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            <Submit busy={feedback.busy}>Enviar comentario</Submit>
          </form>
          <hr />
          <h3>Seguridad de tu cuenta</h3>
          <Link className="text-link" to="/recuperar">
            Cambiar contraseña
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
    </>
  );
}
