import { type ReactNode, useEffect, lazy, Suspense } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import { useAuth } from "./lib/auth";
import { db } from "./lib/supabase";
import { Layout } from "./components/Layout";
import { Loading, Notice, PageTitle } from "./components/ui";
import { Home, Studies, ClinicPage, Privacy } from "./pages/Public";
import { AuthPage } from "./pages/Auth";
import { Appointments, Booking, ProfilePage, Results } from "./pages/Patient";
const Admin = lazy(() =>
  import("./pages/Admin").then((m) => ({ default: m.Admin })),
);
function Protected({
  children,
  staff = false,
}: {
  children: ReactNode;
  staff?: boolean;
}) {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (!auth.session) return <Navigate to="/acceso" replace />;
  if (!auth.profile)
    return (
      <>
        <Notice
          error={
            auth.error ||
            "No se pudo cargar su perfil. Recargue la página o cierre sesión e inténtelo nuevamente."
          }
        />
        <button
          className="button secondary"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </button>
        <button
          className="button secondary"
          onClick={() => db().auth.signOut()}
        >
          Cerrar sesión
        </button>
      </>
    );
  if (staff && auth.profile.role === "patient")
    return <Navigate to="/citas" replace />;
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
export default function App() {
  const auth = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    if (auth.recovering && location.pathname !== "/recuperar")
      navigate("/recuperar", { replace: true });
  }, [auth.recovering, location.pathname, navigate]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="estudios" element={<Studies />} />
        <Route path="clinica" element={<ClinicPage />} />
        <Route path="privacidad" element={<Privacy />} />
        <Route path="acceso" element={<AuthPage mode="login" />} />
        <Route path="registro" element={<AuthPage mode="register" />} />
        <Route path="olvide-contrasena" element={<AuthPage mode="forgot" />} />
        <Route path="recuperar" element={<AuthPage mode="reset" />} />
        <Route
          path="citas"
          element={
            <Protected>
              <Appointments />
            </Protected>
          }
        />
        <Route
          path="agendar"
          element={
            <Protected>
              <Booking />
            </Protected>
          }
        />
        <Route
          path="perfil"
          element={
            <Protected>
              <ProfilePage />
            </Protected>
          }
        />
        <Route
          path="resultados"
          element={
            <Protected>
              <Results />
            </Protected>
          }
        />
        <Route
          path="administracion"
          element={
            <Protected staff>
              <Admin />
            </Protected>
          }
        />
        <Route
          path="*"
          element={
            <>
              <PageTitle eyebrow="404" title="Esta página no existe." />
              <Link className="button" to="/">
                Volver al inicio
              </Link>
            </>
          }
        />
      </Route>
    </Routes>
  );
}
