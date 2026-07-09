import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      fontFamily: "Arial"
    }}>
      <Sidebar />

      <main style={{
        flex: 1,
        padding: "20px",
        background: "#f5f6fa"
      }}>
        <Outlet />
      </main>
    </div>
  );
}