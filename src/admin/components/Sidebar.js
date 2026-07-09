import { Link, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("auth");
    navigate("/login");
  };

  const linkStyle = {
    color: "#fff",
    textDecoration: "none",
    padding: "10px",
    borderRadius: "6px",
    display: "block"
  };

  const activeHover = {
    background: "#1f2937"
  };

  return (
    <div
      style={{
        width: "240px",
        background: "#111827",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        padding: "20px"
      }}
    >
      <h2 style={{ marginBottom: "30px" }}>ADMIN</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

        <Link style={linkStyle} to="/admin/dashboard">
          📊 Dashboard
        </Link>

        <Link style={linkStyle} to="/admin/productos">
          📦 Productos
        </Link>

        <Link style={linkStyle} to="/admin/banners">
          🖼 Banners
        </Link>

        <Link style={linkStyle} to="/admin/configuracion">
          ⚙ Configuración
        </Link>

      </nav>

      <button
        onClick={logout}
        style={{
          marginTop: "auto",
          background: "#ef4444",
          color: "white",
          border: "none",
          padding: "10px",
          cursor: "pointer",
          borderRadius: "6px"
        }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}