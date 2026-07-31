"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "../infra/auth/session.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "../lib/adminSession.js";
import { checkRateLimit } from "../lib/rateLimit.js";

/**
 * Sign-in and sign-out.
 *
 * Every message returned here is the same for a wrong password and an unknown
 * address. Telling the two apart would turn the form into a way to find out
 * who has an account.
 */

const credentials = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export async function signInAction(_previous, formData) {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Revisa el correo y la contraseña." };
  }

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const limit = checkRateLimit(`signin:${ipAddress ?? "unknown"}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return { status: "error", message: "Demasiados intentos. Espera un minuto." };
  }

  const result = await signIn({
    email: parsed.data.email,
    password: parsed.data.password,
    ipAddress,
    userAgent: headerList.get("user-agent"),
  });

  if (!result.ok) {
    if (result.error.kind === "locked") {
      return {
        status: "error",
        message: "Cuenta bloqueada temporalmente. Intenta en unos minutos.",
      };
    }
    if (result.error.kind === "account_disabled") {
      return { status: "error", message: "Esta cuenta está desactivada." };
    }
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }

  await setSessionCookie(result.value.token, result.value.expiresAt);

  // Outside any try/catch: `redirect` works by throwing, and a catch would
  // swallow it and report a failed sign-in that actually succeeded.
  redirect("/admin/dashboard");
}

export async function signOutAction() {
  await signOut(await readSessionToken());
  await clearSessionCookie();
  redirect("/login");
}
