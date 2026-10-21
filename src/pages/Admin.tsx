import { useState, type FormEvent } from "react";
import {
  CalendarDays,
  Users,
  Layers,
  MessageSquare,
  Settings,
  Clock,
  Upload,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/supabase";
import { useAction, useData } from "../lib/hooks";
import { clinicDate, formatDate, money, statusLabel } from "../lib/utils";
import type {
  Appointment,
  Area,
  Clinic,
  Doctor,
  Feedback,
  Profile,
  Schedule,
  Service,
} from "../lib/types";
import {
  Empty,
  Field,
  Loading,
  Notice,
  PageTitle,
  Submit,
} from "../components/ui";

export function Admin() {
  const { profile } = useAuth();
  const [tab, setTab] = useState("agenda");
  const tabs = [
    { id: "agenda", label: "Agenda", icon: CalendarDays },
    { id: "patients", label: "Pacientes", icon: Users },
    { id: "feedback", label: "Comentarios", icon: MessageSquare },
    ...(profile?.role === "admin"
      ? [
          { id: "catalog", label: "Catálogo", icon: Layers },
          { id: "schedules", label: "Horarios", icon: Clock },
          { id: "clinic", label: "Clínica", icon: Settings },
        ]
      : []),
  ];
  return (
    <>
      <PageTitle eyebrow="GESTIÓN DE LA CLÍNICA" title="Administración">
        {profile?.role === "admin"
          ? "Configuración y operación de XPRECION."
          : "Recepción, seguimiento y publicación de resultados."}
      </PageTitle>
      <div className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? "selected" : ""}
          >
            <t.icon size={17} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === "agenda" ? (
        <Agenda />
      ) : tab === "patients" ? (
        <Patients />
      ) : tab === "feedback" ? (
        <FeedbackPage />
      ) : tab === "catalog" ? (
        <Catalog />
      ) : tab === "schedules" ? (
        <Schedules />
      ) : (
        <ClinicSettings />
      )}
    </>
  );
}
function Agenda() {
  const [date, setDate] = useState(clinicDate()),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<Appointment | null>(null);
  const action = useAction();
  const q = useData<Appointment[]>(() => {
    let query = db()
      .from("appointments")
      .select("*,services(name),doctors(name),profiles(full_name,phone)")
      .order("starts_at", { ascending: false });
    if (date)
      query = query
        .gte("starts_at", `${date}T00:00:00-07:00`)
        .lte("starts_at", `${date}T23:59:59.999-07:00`);
    return query.range(page * 25, page * 25 + 24);
  }, [date, page]);
  async function status(a: Appointment, value: string) {
    await action.run(async () => {
      const { error } = await db().rpc("set_appointment_status", {
        p_id: a.id,
        p_status: value,
      });
      if (error) throw error;
      q.reload();
    }, "Estado actualizado.");
  }
  return (
    <>
      <div className="toolbar">
        <Field label="Fecha de atención">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(0);
            }}
          />
        </Field>
        <button
          className="button secondary small"
          onClick={() => {
            setDate("");
            setPage(0);
          }}
        >
          Ver todas
        </button>
        <button className="button secondary small" onClick={q.reload}>
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>
      <Notice error={q.error || action.error} success={action.success} />
      {q.loading ? (
        <Loading />
      ) : q.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha y paciente</th>
                <th>Estudio / médico</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{formatDate(a.starts_at)}</strong>
                    <br />
                    {a.profiles?.full_name}
                    <br />
                    <small>{a.profiles?.phone}</small>
                  </td>
                  <td>
                    {a.services?.name}
                    <br />
                    <small>{a.doctors?.name}</small>
                    {a.notes && (
                      <details>
                        <summary>Nota de recepción</summary>
                        <p>{a.notes}</p>
                      </details>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${a.status}`}>
                      {statusLabel[a.status]}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {a.status === "pending" && (
                        <button
                          disabled={action.busy}
                          onClick={() => status(a, "confirmed")}
                        >
                          Confirmar
                        </button>
                      )}
                      {a.status === "confirmed" && (
                        <button
                          disabled={
                            action.busy || new Date(a.ends_at) > new Date()
                          }
                          onClick={() => status(a, "completed")}
                        >
                          Finalizar
                        </button>
                      )}
                      {["pending", "confirmed"].includes(a.status) && (
                        <button
                          disabled={action.busy}
                          onClick={() => {
                            if (window.confirm("¿Cancelar esta cita?"))
                              void status(a, "cancelled");
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button onClick={() => setSelected(a)}>
                        <Upload size={14} />
                        Resultados
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No hay citas en esta vista">
          Las solicitudes de los pacientes aparecerán aquí.
        </Empty>
      )}
      <Pagination page={page} setPage={setPage} count={q.data?.length || 0} />
      {selected && (
        <ResultUpload
          appointment={selected}
          close={() => setSelected(null)}
          key={selected.id}
        />
      )}
    </>
  );
}
function ResultUpload({
  appointment,
  close,
}: {
  appointment: Appointment;
  close: () => void;
}) {
  const action = useAction();
  const q = useData<{ id: string; title: string; file_path: string }[]>(
    () =>
      db()
        .from("results")
        .select("id,title,file_path")
        .eq("appointment_id", appointment.id),
    [appointment.id],
  );
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    await action.run(async () => {
      const file = fd.get("file") as File;
      if (
        !file ||
        file.type !== "application/pdf" ||
        file.size > 10 * 1024 * 1024 ||
        file.size === 0
      )
        throw new Error("Seleccione un PDF de hasta 10 MB.");
      const signature = new TextDecoder().decode(
        await file.slice(0, 5).arrayBuffer(),
      );
      if (signature !== "%PDF-")
        throw new Error("El archivo no tiene un encabezado PDF válido.");
      const path = `${appointment.patient_id}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await db()
        .storage.from("results")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw uploadError;
      const { error } = await db()
        .from("results")
        .insert({
          appointment_id: appointment.id,
          patient_id: appointment.patient_id,
          title: String(fd.get("title")).trim(),
          file_path: path,
        });
      if (error) {
        await db().storage.from("results").remove([path]);
        throw error;
      }
      form.reset();
      q.reload();
    }, "Resultado publicado para el paciente.");
  }
  return (
    <section className="panel section">
      <div className="toolbar">
        <h2>Resultados · {appointment.profiles?.full_name}</h2>
        <button className="button secondary small" onClick={close}>
          Cerrar
        </button>
      </div>
      <p>
        {appointment.services?.name} · {formatDate(appointment.starts_at)}
      </p>
      <Notice error={action.error || q.error} success={action.success} />
      <form onSubmit={upload} className="two-col">
        <Field label="Título del resultado">
          <input name="title" required minLength={2} maxLength={150} />
        </Field>
        <Field label="Documento PDF (máximo 10 MB)">
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            required
          />
        </Field>
        <Submit busy={action.busy}>Publicar resultado</Submit>
      </form>
      {q.data?.map((r) => (
        <div className="list-row" key={r.id}>
          <span>{r.title}</span>
          <button
            disabled={action.busy}
            className="button danger small"
            onClick={() => {
              if (
                window.confirm(
                  "¿Retirar este resultado? Dejará de estar disponible para el paciente.",
                )
              )
                void action.run(async () => {
                  // Remove metadata first: patients lose access even if object cleanup fails.
                  const { error } = await db()
                    .from("results")
                    .delete()
                    .eq("id", r.id);
                  if (error) throw error;
                  const { error: storageError } = await db()
                    .storage.from("results")
                    .remove([r.file_path]);
                  q.reload();
                  if (storageError)
                    throw new Error(
                      "Resultado retirado. No fue posible eliminar el archivo del almacenamiento; solicite su limpieza al administrador.",
                    );
                }, "Resultado retirado.");
            }}
          >
            Retirar
          </button>
        </div>
      ))}
    </section>
  );
}
function Pagination({
  page,
  setPage,
  count,
}: {
  page: number;
  setPage: (p: number) => void;
  count: number;
}) {
  return (
    <div className="pagination">
      <button
        className="button secondary small"
        disabled={!page}
        onClick={() => setPage(page - 1)}
      >
        Anterior
      </button>
      <span>Página {page + 1}</span>
      <button
        className="button secondary small"
        disabled={count < 25}
        onClick={() => setPage(page + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
function Patients() {
  const [term, setTerm] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const q = useData<Profile[]>(
    () =>
      db()
        .from("profiles")
        .select("*")
        .eq("role", "patient")
        .ilike("full_name", `%${search.replace(/[%_]/g, "")}%`)
        .order("full_name")
        .range(page * 25, page * 25 + 24),
    [search, page],
  );
  return (
    <>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(term);
          setPage(0);
        }}
      >
        <Field label="Buscar paciente">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nombre completo"
          />
        </Field>
        <button className="button small">Buscar</button>
      </form>
      <Notice error={q.error} />
      {q.loading ? (
        <Loading />
      ) : q.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Nacimiento</th>
                <th>Teléfono</th>
                <th>Dirección</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.full_name}</strong>
                    <br />
                    <small>@{p.username}</small>
                  </td>
                  <td>{p.birth_date || "Sin registrar"}</td>
                  <td>{p.phone || "Sin registrar"}</td>
                  <td>{p.address || "Sin registrar"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Sin pacientes en esta vista" />
      )}
      <Pagination page={page} setPage={setPage} count={q.data?.length || 0} />
    </>
  );
}
function FeedbackPage() {
  const action = useAction();
  const [page, setPage] = useState(0);
  const q = useData<Feedback[]>(
    () =>
      db()
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * 25, page * 25 + 24),
    [page],
  );
  return (
    <>
      <Notice error={q.error || action.error} success={action.success} />
      {q.loading ? (
        <Loading />
      ) : q.data?.length ? (
        q.data.map((f) => (
          <article className="panel feedback-card" key={f.id}>
            <span className={`badge ${f.resolved ? "completed" : "pending"}`}>
              {f.resolved ? "Atendido" : "Pendiente"}
            </span>
            <p className="preserve-lines">{f.message}</p>
            <small>{formatDate(f.created_at)}</small>
            <button
              className="button secondary small"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  const { error } = await db()
                    .from("feedback")
                    .update({ resolved: !f.resolved })
                    .eq("id", f.id);
                  if (error) throw error;
                  q.reload();
                })
              }
            >
              {f.resolved ? "Marcar pendiente" : "Marcar atendido"}
            </button>
          </article>
        ))
      ) : (
        <Empty title="Sin comentarios recibidos" />
      )}
      <Pagination page={page} setPage={setPage} count={q.data?.length || 0} />
    </>
  );
}

function Catalog() {
  const [kind, setKind] = useState<"services" | "doctors" | "areas">(
      "services",
    ),
    [editing, setEditing] = useState<Service | Doctor | Area | null>(null);
  const action = useAction();
  const areas = useData<Area[]>(() =>
    db().from("areas").select("*").order("name"),
  );
  const q = useData<(Service | Doctor | Area)[]>(
    () => db().from(kind).select("*").order("name"),
    [kind],
  );
  const labels = { services: "Estudios", doctors: "Médicos", areas: "Áreas" };
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    await action.run(async () => {
      const payload: Record<string, unknown> = {
        name: String(fd.get("name")).trim(),
        active: fd.get("active") === "on",
      };
      if (kind !== "areas") payload.area_id = fd.get("area_id");
      if (kind === "services") {
        payload.description = fd.get("description");
        payload.preparation = fd.get("preparation");
        payload.price = fd.get("price") === "" ? null : Number(fd.get("price"));
      }
      const { error } = await (editing
        ? db().from(kind).update(payload).eq("id", editing.id)
        : db().from(kind).insert(payload));
      if (error) throw error;
      setEditing(null);
      form.reset();
      q.reload();
      areas.reload();
    });
  }
  const s = editing as Service | null;
  return (
    <>
      <div className="segmented section-small">
        {Object.entries(labels).map(([k, label]) => (
          <button
            key={k}
            className={kind === k ? "selected" : ""}
            onClick={() => {
              setKind(k as typeof kind);
              setEditing(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <Notice
        error={q.error || areas.error || action.error}
        success={action.success}
      />
      <div className="two-col">
        <section className="panel">
          <h2>
            {editing ? "Editar" : "Agregar"} · {labels[kind]}
          </h2>
          <form key={`${kind}-${editing?.id || "new"}`} onSubmit={save}>
            <Field label="Nombre">
              <input
                name="name"
                required
                minLength={2}
                maxLength={kind === "areas" ? 100 : 150}
                defaultValue={editing?.name}
              />
            </Field>
            {kind !== "areas" && (
              <Field label="Área">
                <select name="area_id" required defaultValue={s?.area_id || ""}>
                  <option value="">Seleccionar área</option>
                  {areas.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {!a.active ? " (inactiva)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {kind === "services" && (
              <>
                <Field label="Descripción">
                  <textarea name="description" defaultValue={s?.description} />
                </Field>
                <Field label="Preparación del paciente">
                  <textarea name="preparation" defaultValue={s?.preparation} />
                </Field>
                <Field label="Precio MXN (vacío: consultar)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="99999999.99"
                    name="price"
                    defaultValue={s?.price ?? ""}
                  />
                </Field>
              </>
            )}
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing?.active ?? true}
              />
              Disponible
            </label>
            <div className="toolbar">
              <Submit busy={action.busy}>Guardar</Submit>
              {editing && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditing(null)}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="panel">
          <h2>{labels[kind]} registrados</h2>
          {q.loading ? (
            <Loading />
          ) : q.data?.length ? (
            q.data.map((row) => (
              <div key={row.id} className="list-row">
                <div>
                  <strong>{row.name}</strong>
                  <small>
                    {row.active ? "Disponible" : "Inactivo"}
                    {kind === "services"
                      ? ` · ${money((row as Service).price)}`
                      : ""}
                  </small>
                </div>
                <button
                  className="button secondary small"
                  onClick={() => setEditing(row)}
                >
                  Editar
                </button>
              </div>
            ))
          ) : (
            <Empty title="Aún no hay registros" />
          )}
        </section>
      </div>
    </>
  );
}
function Schedules() {
  const [doctor, setDoctor] = useState("");
  const action = useAction();
  const days = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const doctors = useData<Doctor[]>(() =>
    db().from("doctors").select("*").order("name"),
  );
  const q = useData<Schedule[]>(
    () =>
      doctor
        ? db()
            .from("schedules")
            .select("*")
            .eq("doctor_id", doctor)
            .order("weekday")
        : Promise.resolve({ data: [], error: null }),
    [doctor],
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await action.run(async () => {
      const { error } = await db()
        .from("schedules")
        .upsert(
          {
            doctor_id: doctor,
            weekday: Number(fd.get("weekday")),
            opens_at: fd.get("opens_at"),
            closes_at: fd.get("closes_at"),
          },
          { onConflict: "doctor_id,weekday" },
        );
      if (error) throw error;
      q.reload();
    });
  }
  return (
    <>
      <Notice
        error={action.error || doctors.error || q.error}
        success={action.success}
      />
      <Field label="Médico">
        <select value={doctor} onChange={(e) => setDoctor(e.target.value)}>
          <option value="">Selecciona un médico</option>
          {doctors.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </Field>
      {doctor && (
        <div className="two-col section">
          <section className="panel">
            <h2>Horario semanal</h2>
            <p>
              Zona horaria: Mazatlán. Turnos de 30 minutos; configurar un día
              reemplaza su horario anterior. Las citas existentes se conservan.
            </p>
            <form onSubmit={save}>
              <Field label="Día">
                <select name="weekday">
                  {days.slice(1).map((d, i) => (
                    <option key={d} value={i + 1}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Apertura">
                <input
                  type="time"
                  name="opens_at"
                  step="1800"
                  defaultValue="08:00"
                  required
                />
              </Field>
              <Field label="Cierre">
                <input
                  type="time"
                  name="closes_at"
                  step="1800"
                  defaultValue="16:00"
                  required
                />
              </Field>
              <Submit busy={action.busy}>Guardar horario</Submit>
            </form>
          </section>
          <section className="panel">
            <h2>Días habilitados</h2>
            {q.loading ? (
              <Loading />
            ) : q.data?.length ? (
              q.data.map((s) => (
                <div className="list-row" key={s.id}>
                  <div>
                    <strong>{days[s.weekday]}</strong>
                    <small>
                      {s.opens_at.slice(0, 5)} – {s.closes_at.slice(0, 5)}
                    </small>
                  </div>
                  <button
                    className="button danger small"
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Deshabilitar este día? No se cancelarán las citas ya reservadas.",
                        )
                      )
                        void action.run(async () => {
                          const { error } = await db()
                            .from("schedules")
                            .delete()
                            .eq("id", s.id);
                          if (error) throw error;
                          q.reload();
                        });
                    }}
                  >
                    Retirar
                  </button>
                </div>
              ))
            ) : (
              <Empty title="Sin horarios habilitados" />
            )}
          </section>
        </div>
      )}
    </>
  );
}
function ClinicSettings() {
  const action = useAction();
  const q = useData<Clinic>(() =>
    db().from("clinic_settings").select("*").eq("id", true).single(),
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await action.run(async () => {
      const { error } = await db()
        .from("clinic_settings")
        .update({
          name: fd.get("name"),
          phone: fd.get("phone"),
          address: fd.get("address"),
          email: fd.get("email"),
        })
        .eq("id", true);
      if (error) throw error;
      q.reload();
    });
  }
  return (
    <section className="panel narrow">
      <h2>Información pública de contacto</h2>
      <Notice error={q.error || action.error} success={action.success} />
      {q.loading ? (
        <Loading />
      ) : (
        <form onSubmit={save}>
          <Field label="Nombre">
            <input name="name" required defaultValue={q.data?.name} />
          </Field>
          <Field label="Teléfono">
            <input type="tel" name="phone" defaultValue={q.data?.phone} />
          </Field>
          <Field label="Dirección">
            <textarea name="address" defaultValue={q.data?.address} />
          </Field>
          <Field label="Correo">
            <input type="email" name="email" defaultValue={q.data?.email} />
          </Field>
          <Submit busy={action.busy}>Publicar datos</Submit>
        </form>
      )}
    </section>
  );
}
