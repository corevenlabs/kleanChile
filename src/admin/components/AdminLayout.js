"use client";

import Sidebar from "./Sidebar";
import { AdminProvider } from "../context/AdminContext";
import "../styles/admin.css";

export default function AdminLayout({ children }) {
  return <AdminProvider><div className="admin-shell"><Sidebar /><main className="admin-main"><div className="admin-topbar"><div><span className="admin-topbar__eyebrow">Panel de gestión</span><strong>KleanChile</strong></div><div className="admin-avatar">KC</div></div>{children}</main></div></AdminProvider>;
}
