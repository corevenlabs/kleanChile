"use client";

import { useActionState } from "react";
import NextLink from "next/link";
import { signInAction } from "../../actions/auth";

export default function SignInForm() {
  const [state, formAction, pending] = useActionState(signInAction, { status: "idle" });

  return (
    <main className="admin-login">
      <section className="admin-login__card">
        <NextLink href="/" className="admin-login__brand">
          <img src="/brand/mark.png" alt="" width={256} height={256} />
          <strong>KleanChile</strong>
        </NextLink>

        <div className="admin-login__intro">
          <p className="admin-kicker">PANEL DE ADMINISTRACIÓN</p>
          <h1>Bienvenido</h1>
          <p>Ingresa para gestionar el contenido de tu sitio.</p>
        </div>

        <form action={formAction}>
          <label>
            Correo electrónico
            <input required type="email" name="email" autoComplete="username" placeholder="admin@kleanchile.cl" />
          </label>
          <label>
            Contraseña
            <input required type="password" name="password" autoComplete="current-password" placeholder="••••••••" />
          </label>

          {/* One message for a wrong password and for an unknown address — see
              the comment in src/actions/auth.js. */}
          {state.status === "error" && (
            <p className="admin-saved" role="alert">
              {state.message}
            </p>
          )}

          <button className="admin-button" disabled={pending}>
            {pending ? "Verificando…" : "Ingresar al panel"}
          </button>
        </form>

        <small className="admin-login__hint">
          ¿Sin cuenta? Se crean desde el servidor con <code>npm run admin:create</code>.
        </small>
      </section>

      <aside className="admin-login__visual">
        <div>
          <span>GESTIÓN SIMPLE</span>
          <h2>Tu sitio, siempre actualizado.</h2>
          <p>Portada, productos y datos comerciales desde una interfaz limpia y fácil de usar.</p>
        </div>
      </aside>
    </main>
  );
}
