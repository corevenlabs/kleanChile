import Sidebar from "./Sidebar";

/**
 * Chrome for every admin page.
 *
 * A Server Component: the only interactive parts are the sidebar's active-link
 * highlight and the sign-out form, so the shell itself ships no JavaScript. The
 * content provider that used to live here is gone — state now lives in the
 * database, and each page loads what it needs.
 */
export default function AdminLayout({ user, children }) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">
        <div className="admin-topbar">
          <div>
            <span className="admin-topbar__eyebrow">Panel de gestión</span>
            <strong>KleanChile</strong>
          </div>
          <div className="admin-avatar" title={user.email}>
            {initials || "KC"}
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
