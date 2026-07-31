import { redirect } from "next/navigation";
import SignInForm from "../../src/admin/components/SignInForm";
import { currentUser } from "../../src/lib/adminSession.js";

export const metadata = { title: "Ingresar", robots: { index: false, follow: false } };

export default async function Page() {
  // Someone already signed in has no business on the login screen; sending them
  // on saves a confusing second sign-in that would silently work.
  if (await currentUser()) redirect("/admin/dashboard");

  return <SignInForm />;
}
