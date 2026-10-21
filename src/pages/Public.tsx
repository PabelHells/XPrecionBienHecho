import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Activity,
  ScanLine,
  HeartPulse,
  ShieldCheck,
  CalendarDays,
  FileCheck2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { useState } from "react";
import { configured, db } from "../lib/supabase";
import { useData } from "../lib/hooks";
import type { Clinic, Service } from "../lib/types";
import { Empty, Field, Loading, Notice, PageTitle } from "../components/ui";
import { money } from "../lib/utils";
export function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="dot" />
            CERCA DE TI, EN CADA PASO
          </span>
          <h1>
            La claridad que necesitas.
            <br />
            <em>El cuidado que mereces.</em>
          </h1>
          <p>
            Tu diagnóstico comienza con atención. Conoce nuestros estudios y
            gestiona tu salud de forma sencilla, dondequiera que estés.
          </p>
          <div className="hero-actions">
            <Link to="/agendar" className="button">
              Agendar una cita
              <ArrowUpRight size={19} />
            </Link>
            <Link to="/estudios" className="text-link">
              Explorar estudios
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-note">
            <ShieldCheck size={20} />
            <span>Tu información, en un espacio personal y privado.</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="scan-core">
            <Activity size={110} strokeWidth={1} />
          </div>
          <div className="art-caption">
            <span>PRECISIÓN EN CADA IMAGEN</span>
            <strong>
              Una mirada más clara
              <br />a tu bienestar.
            </strong>
          </div>
          <div className="art-badge">
            <ScanLine size={19} />
            Diagnóstico por imagen
          </div>
          <span className="cross cross-one">+</span>
          <span className="cross cross-two">+</span>
        </div>
      </section>
      <div className="quick-access">
        <Link to="/agendar">
          <span className="soft-icon">
            <CalendarDays />
          </span>
          <div>
            <strong>Agenda tu estudio</strong>
            <span>Encuentra un horario disponible</span>
          </div>
          <ArrowUpRight />
        </Link>
        <Link to="/resultados">
          <span className="soft-icon">
            <FileCheck2 />
          </span>
          <div>
            <strong>Consulta tus resultados</strong>
            <span>Accede desde tu cuenta</span>
          </div>
          <ArrowUpRight />
        </Link>
        <Link to="/clinica">
          <span className="soft-icon">
            <HeartPulse />
          </span>
          <div>
            <strong>Conoce la clínica</strong>
            <span>Atención y contacto</span>
          </div>
          <ArrowUpRight />
        </Link>
      </div>
      <section className="section">
        <PageTitle
          eyebrow="NUESTROS ESTUDIOS"
          title="Respuestas para cuidar de ti."
          action={
            <Link className="text-link" to="/estudios">
              Ver catálogo
              <ArrowRight size={18} />
            </Link>
          }
        />
        <div className="cards-grid">
          {[
            {
              name: "Tomografía",
              description: "Una visión por cortes de las estructuras internas.",
              icon: ScanLine,
            },
            {
              name: "Ultrasonido",
              description: "Imagen por ondas de sonido para tu evaluación.",
              icon: Activity,
            },
            {
              name: "Radiología",
              description: "Estudios de imagen para apoyar tu diagnóstico.",
              icon: HeartPulse,
            },
          ].map((s, i) => (
            <Link to="/estudios" className="study-card" key={s.name}>
              <div className="card-top">
                <s.icon size={29} strokeWidth={1.4} />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <span className="text-link">
                Conocer estudios
                <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="care-strip">
        <div>
          <span className="eyebrow">TU ESPACIO PERSONAL</span>
          <h2>
            Menos trámites.
            <br />
            Más tiempo para ti.
          </h2>
        </div>
        <div>
          <p>
            Crea tu cuenta para administrar tus citas y consultar los resultados
            que publique el personal de la clínica.
          </p>
          <Link to="/registro" className="button light">
            Crear mi cuenta
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
export function Studies() {
  const [search, setSearch] = useState("");
  const q = useData<Service[]>(() =>
    configured
      ? db().from("services").select("*").eq("active", true).order("name")
      : Promise.resolve({ data: [], error: null }),
  );
  const rows =
    q.data?.filter((s) =>
      s.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")),
    ) || [];
  return (
    <>
      <PageTitle eyebrow="DIAGNÓSTICO POR IMAGEN" title="Nuestros estudios">
        Consulta el catálogo y las indicaciones publicadas por la clínica.
      </PageTitle>
      <Field label="Buscar estudio">
        <input
          type="search"
          placeholder="Tomografía, ultrasonido, rayos X…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      <Notice error={q.error} />
      {q.loading ? (
        <Loading />
      ) : rows.length ? (
        <div className="cards-grid section">
          {rows.map((s) => (
            <article className="study-card" key={s.id}>
              <ScanLine size={28} />
              <h2>{s.name}</h2>
              <p>{s.description}</p>
              <p className="price">{money(s.price)}</p>
              {s.preparation && (
                <details>
                  <summary>Preparación para el estudio</summary>
                  <p>{s.preparation}</p>
                </details>
              )}
              <Link className="text-link" to={`/agendar?estudio=${s.id}`}>
                Consultar disponibilidad
                <ArrowUpRight size={18} />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            configured
              ? "No se encontraron estudios"
              : "Catálogo pendiente de conexión"
          }
        >
          Los estudios disponibles aparecerán aquí.
        </Empty>
      )}
    </>
  );
}
export function ClinicPage() {
  const q = useData<Clinic>(() =>
    configured
      ? db().from("clinic_settings").select("*").eq("id", true).single()
      : Promise.resolve({ data: null, error: null }),
  );
  return (
    <>
      <PageTitle
        eyebrow="ACERCA DE XPRECION"
        title="Atención que comienza contigo."
      >
        Centro médico dedicado al diagnóstico por imagen.
      </PageTitle>
      <div className="two-col">
        <article className="panel prose">
          <HeartPulse size={36} />
          <h2>Un proceso más sencillo</h2>
          <p>
            Consulta nuestros servicios, elige entre los horarios habilitados y
            da seguimiento a tus citas desde tu cuenta.
          </p>
          <p>
            El personal revisa las solicitudes y confirma su estado. Cuando tu
            resultado esté disponible, podrás consultarlo en tu espacio privado.
          </p>
          <Link to="/agendar" className="button">
            Consultar horarios
            <CalendarDays size={18} />
          </Link>
        </article>
        <article className="panel prose">
          <h2>Contacto y horarios</h2>
          <Notice error={q.error} />
          {q.loading ? (
            <Loading />
          ) : (
            <>
              <p>
                <MapPin size={18} />{" "}
                {q.data?.address || "Dirección pendiente de publicación."}
              </p>
              <p>
                <Phone size={18} />{" "}
                {q.data?.phone || "Teléfono pendiente de publicación."}
              </p>
              <p>
                <Mail size={18} />{" "}
                {q.data?.email || "Correo pendiente de publicación."}
              </p>
              <p>
                Las citas se ofrecen de lunes a viernes, de acuerdo con los
                horarios configurados para cada médico. Todas las horas se
                muestran en la zona de Mazatlán.
              </p>
            </>
          )}
        </article>
      </div>
    </>
  );
}
export function Privacy() {
  return (
    <>
      <PageTitle eyebrow="INFORMACIÓN PERSONAL" title="Privacidad y acceso" />
      <article className="panel prose narrow">
        <h2>Tu cuenta y tus documentos</h2>
        <p>
          El sistema utiliza los datos de tu perfil para identificar tus citas.
          El acceso a los resultados se limita al titular de la cuenta y al
          personal autorizado de la clínica.
        </p>
        <p>
          Los documentos se almacenan de forma privada y se abren mediante
          enlaces temporales. Cierra tu sesión cuando uses un dispositivo
          compartido.
        </p>
        <h2>Aviso de privacidad de la clínica</h2>
        <p>
          Antes de abrir el registro al público, XPRECION debe publicar aquí su
          aviso de privacidad aprobado, con la identidad y domicilio del
          responsable, finalidades, conservación, transferencias y medios para
          ejercer los derechos correspondientes. Este texto informativo no
          sustituye ese aviso.
        </p>
        <Link to="/clinica" className="text-link">
          Consultar datos de contacto
          <ArrowRight size={18} />
        </Link>
      </article>
    </>
  );
}
