import AdminLayout from "../../src/admin/components/AdminLayout";
import { requireUser } from "../../src/lib/adminSession.js";

export const metadata = {
  /*
   * Its own template, not the storefront's.
   *
   * A plain string here would replace the root's `title` object outright and
   * leave every page below with no template at all — `/admin/pedidos` rendered
   * a tab reading just "Pedidos". Admin tabs are also the ones most likely to
   * sit beside half a dozen shop tabs, so they say which side they are on.
   */
  title: { default: "Administración", template: "%s · Admin KleanChile" },
  // Nothing under /admin should ever be indexed, and this is inherited by
  // every page below it.
  robots: { index: false, follow: false },
};

/**
 * The guard here is for convenience, not for security.
 *
 * Every page below calls `requireUser` itself, and so does every Server
 * Action, because an action is its own POST endpoint that can be invoked
 * without this layout ever rendering. Checking here only saves each page from
 * having to redirect before it can draw anything.
 */
export default async function Layout({ children }) {
  const user = await requireUser();

  return <AdminLayout user={user}>{children}</AdminLayout>;
}
