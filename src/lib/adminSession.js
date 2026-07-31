import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionUser } from "../infra/auth/session.js";

/**
 * The admin session cookie, and the guard every admin page goes through.
 *
 * `sameSite: strict`, because every request this cookie authorises is a
 * privileged one and none of them should ever ride along on a cross-site
 * navigation. Combined with Server Actions' own origin checks, that closes CSRF
 * without a token dance.
 */

const COOKIE = "klean_admin";

export async function setSessionCookie(token, expiresAt) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function readSessionToken() {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** The signed-in user, or null. For places where being signed out is fine. */
export async function currentUser() {
  return findSessionUser(await readSessionToken());
}

/**
 * The signed-in user, or a redirect to the login page.
 *
 * Every admin page and every admin Server Action calls this itself. Guarding
 * the layout alone would not be enough: a Server Action is its own POST
 * endpoint and can be invoked directly, without ever rendering the page whose
 * form it belongs to.
 */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
