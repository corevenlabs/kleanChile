export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "20px",
        marginTop: "20px"
      }}>
        
        <div style={{ background: "#fff", padding: "20px" }}>
          📦 Productos
        </div>

        <div style={{ background: "#fff", padding: "20px" }}>
          🖼 Banner
        </div>

        <div style={{ background: "#fff", padding: "20px" }}>
          ⚙ Configuración
        </div>

      </div>
    </div>
  );
}