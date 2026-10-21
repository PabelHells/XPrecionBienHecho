import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { authRedirect, configured, db } from "../lib/supabase";
import { useAction } from "../lib/hooks";
import { Field, Notice, Submit } from "../components/ui";
import { validatePassword } from "../lib/utils";
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "forgot" | "reset";
}) {
  const auth = useAuth(),
    nav = useNavigate(),
    action = useAction();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [username, setUsername] = useState(""),
    [name, setName] = useState("");
  if (auth.session && mode !== "reset" && !auth.recovering)
    return <Navigate to="/citas" replace />;
  const title = {
    login: "Bienvenido de nuevo.",
    register: "Tu salud, en un solo lugar.",
    forgot: "Recupera tu acceso.",
    reset: "Elige una nueva contraseña.",
  }[mode];
  async function submit(e: FormEvent) {
    e.preventDefault();
    await action.run(
      async () => {
        if (mode === "login") {
          const { error } = await db().auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) throw error;
          nav("/citas");
        }
        if (mode === "register") {
          if (!validatePassword(password))
            throw new Error("Use al menos 12 caracteres para su contraseña.");
          if (password !== confirm)
            throw new Error("Las contraseñas no coinciden.");
          const { data, error } = await db().auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { username: username.trim(), full_name: name.trim() },
              emailRedirectTo: authRedirect(),
            },
          });
          if (error) throw error;
          if (data.session) nav("/perfil");
        }
        if (mode === "forgot") {
          const { error } = await db().auth.resetPasswordForEmail(
            email.trim(),
            { redirectTo: authRedirect() },
          );
          if (error) throw error;
        }
        if (mode === "reset") {
          if (!auth.session)
            throw new Error(
              "Abra el enlace de recuperación recibido en su correo.",
            );
          if (!validatePassword(password) || password !== confirm)
            throw new Error(
              "Use al menos 12 caracteres y confirme la misma contraseña.",
            );
          const { error } = await db().auth.updateUser({ password });
          if (error) throw error;
          auth.endRecovery();
          nav("/perfil");
        }
      },
      mode === "register"
        ? "Revise su correo para confirmar su cuenta."
        : mode === "forgot"
          ? "Si el correo está registrado, recibirá un enlace de recuperación."
          : "",
    );
  }
  return (
    <div className="auth-grid">
      <section className="auth-aside">
        <span className="eyebrow">MI XPRECION</span>
        <h1>
          Cuidarte también
          <br />
          es hacerlo fácil.
        </h1>
        <p>
          Administra tus citas y consulta tus resultados desde tu computadora o
          teléfono.
        </p>
        <ShieldCheck size={54} strokeWidth={1} />
      </section>
      <section className="panel auth-panel">
        <h2>{title}</h2>
        <p>
          {mode === "login"
            ? "Ingresa con tu correo electrónico y contraseña."
            : "Completa los datos para continuar."}
        </p>
        <Notice error={action.error} success={action.success} />
        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <Field label="Nombre completo">
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Nombre de usuario">
                <input
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[A-Za-z0-9_]+"
                  title="Letras, números y guion bajo"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
            </>
          )}
          {mode !== "reset" && (
            <Field label="Correo electrónico">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          {mode !== "forgot" && (
            <Field label="Contraseña">
              <input
                type="password"
                required
                minLength={mode === "login" ? 1 : 12}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          {(mode === "register" || mode === "reset") && (
            <>
              <Field label="Confirmar contraseña">
                <input
                  type="password"
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
              <p className="hint">Utilice al menos 12 caracteres.</p>
            </>
          )}
          {mode === "register" && (
            <p className="hint">
              Consulte la{" "}
              <Link to="/privacidad">información de privacidad</Link> antes de
              registrar sus datos.
            </p>
          )}
          <Submit busy={action.busy} disabled={!configured}>
            {mode === "login"
              ? "Ingresar"
              : mode === "register"
                ? "Crear cuenta"
                : mode === "forgot"
                  ? "Enviar enlace"
                  : "Guardar contraseña"}
            <ArrowUpRight size={18} />
          </Submit>
        </form>
        <div className="auth-links">
          {mode === "login" ? (
            <>
              <Link to="/registro">Crear una cuenta</Link>
              <Link to="/olvide-contrasena">Olvidé mi contraseña</Link>
            </>
          ) : (
            <Link to="/acceso">Volver a iniciar sesión</Link>
          )}
        </div>
      </section>
    </div>
  );
}
