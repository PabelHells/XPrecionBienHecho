import { useState } from "react";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { configured, db } from "../lib/supabase";
import { useAction } from "../lib/hooks";
import { Notice } from "./ui";
export function Layout() {
  const { session, profile, error } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const action = useAction();
  return (
    <>
      <div className="topline">
        <span>Diagnóstico por imagen · Centro médico</span>
        <span>Tu salud, con claridad.</span>
      </div>
      <header className="site-header">
        <div className="container nav-wrap">
          <Link to="/" className="brand" aria-label="XPRECION inicio">
            <span className="brand-icon">
              <Activity />
            </span>
            <span>
              XPRECION<small>CENTRO MÉDICO</small>
            </span>
          </Link>
          <button
            className="menu-toggle icon-button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            className={open ? "navigation open" : "navigation"}
            aria-label="Principal"
            onClick={() => setOpen(false)}
          >
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/estudios">Estudios</NavLink>
            <NavLink to="/clinica">La clínica</NavLink>
            {session ? (
              <>
                <NavLink to="/citas">Mis citas</NavLink>
                <NavLink to="/resultados">Resultados</NavLink>
                {profile?.role !== "patient" && profile && (
                  <NavLink to="/administracion">
                    <ShieldCheck size={16} />
                    Administración
                  </NavLink>
                )}
                <NavLink to="/perfil" className="profile-link">
                  <UserRound size={17} />
                  {profile?.username || "Mi perfil"}
                </NavLink>
                <button
                  className="icon-button"
                  aria-label="Cerrar sesión"
                  disabled={action.busy}
                  onClick={() =>
                    action.run(async () => {
                      const { error } = await db().auth.signOut();
                      if (error) throw error;
                      nav("/");
                    }, "")
                  }
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="button small" to="/acceso">
                Iniciar sesión
                <ArrowUpRight size={16} />
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="container main">
        <Notice error={error || action.error} />
        {!configured && (
          <div className="setup-banner" role="status">
            Vista previa: la conexión con Supabase está pendiente. Las reservas
            y el acceso se habilitarán al configurarla.
          </div>
        )}
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-content">
          <div className="brand">
            <span className="brand-icon">
              <Activity />
            </span>
            <span>
              XPRECION<small>CUIDADO QUE DA CONFIANZA</small>
            </span>
          </div>
          <p>
            Un espacio para cuidar de ti.
            <br />
            Estudios, citas y resultados en un solo lugar.
          </p>
          <div>
            <Link to="/privacidad">Privacidad y datos</Link>
            <small>© {new Date().getFullYear()} XPRECION</small>
          </div>
        </div>
      </footer>
      {session && (
        <nav className="bottom-nav" aria-label="Navegación móvil">
          <NavLink to="/citas">
            <CalendarDays size={21} />
            Citas
          </NavLink>
          <NavLink to="/resultados">
            <Activity size={21} />
            Resultados
          </NavLink>
          <NavLink to="/perfil">
            <UserRound size={21} />
            Perfil
          </NavLink>
        </nav>
      )}
    </>
  );
}
