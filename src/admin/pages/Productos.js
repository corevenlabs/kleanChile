import { useState } from "react";

export default function Productos() {
  const [productos, setProductos] = useState([
    {
      id: 1,
      nombre: "Ejemplo producto",
      precio: 10,
      imagen: "https://via.placeholder.com/50"
    }
  ]);

  const [open, setOpen] = useState(false);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [imagen, setImagen] = useState("");

  // ➕ CREAR PRODUCTO
  const agregarProducto = () => {
    if (!nombre || !precio || !imagen) return;

    const nuevo = {
      id: Date.now(),
      nombre,
      precio: Number(precio),
      imagen
    };

    setProductos([...productos, nuevo]);

    setNombre("");
    setPrecio("");
    setImagen("");
    setOpen(false);
  };

  // 🗑 ELIMINAR
  const eliminarProducto = (id) => {
    setProductos(productos.filter((p) => p.id !== id));
  };

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.title}>Productos</h1>

        <button style={styles.button} onClick={() => setOpen(true)}>
          + Nuevo producto
        </button>
      </div>

      {/* TABLE */}
      <div style={styles.card}>
        <div style={styles.tableHeader}>
          <span>Imagen</span>
          <span>Nombre</span>
          <span>Precio</span>
          <span>Acciones</span>
        </div>

        {productos.map((p) => (
          <div key={p.id} style={styles.row}>

            <img
              src={p.imagen}
              alt={p.nombre}
              style={styles.img}
            />

            <span>{p.nombre}</span>
            <span>${p.precio}</span>

            <div style={styles.actions}>
              <span style={{ cursor: "pointer" }}>✏️</span>
              <span
                style={{ cursor: "pointer" }}
                onClick={() => eliminarProducto(p.id)}
              >
                🗑️
              </span>
            </div>

          </div>
        ))}
      </div>

      {/* MODAL */}
      {open && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>

            <h2>Nuevo producto</h2>

            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={styles.input}
            />

            <input
              placeholder="Precio"
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              style={styles.input}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];

                const reader = new FileReader();
                reader.onloadend = () => {
                  setImagen(reader.result); // base64
                };

                if (file) {
                  reader.readAsDataURL(file);
                }
              }}
            />

            <button style={styles.saveBtn} onClick={agregarProducto}>
              Guardar
            </button>

            <button
              style={styles.cancelBtn}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

/* =======================
   ESTILOS COMPLETOS
======================= */
const styles = {
  container: {
    padding: "10px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },

  title: {
    margin: 0,
    fontSize: "24px"
  },

  button: {
    padding: "10px 14px",
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  card: {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    padding: "12px",
    background: "#111827",
    color: "#fff",
    fontSize: "14px"
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    padding: "12px",
    borderBottom: "1px solid #eee",
    fontSize: "14px"
  },

  actions: {
    display: "flex",
    gap: "15px"
  },

  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  modal: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc"
  },

  saveBtn: {
    padding: "10px",
    background: "#22c55e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  cancelBtn: {
    padding: "10px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  }
};