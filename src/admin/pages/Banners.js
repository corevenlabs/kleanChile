import { useState } from "react";

export default function Banners() {
    const [banners, setBanners] = useState([
        {
            id: 1,
            titulo: "Banner ejemplo",
            imagen: "https://via.placeholder.com/300",
            link: "#"
        }
    ]);

    const [open, setOpen] = useState(false);

    const [titulo, setTitulo] = useState("");
    const [imagen, setImagen] = useState("");
    const [link, setLink] = useState("");

    // ➕ crear banner
    const agregarBanner = () => {
        if (!titulo || !imagen) return;

        const nuevo = {
            id: Date.now(),
            titulo,
            imagen,
            link
        };

        setBanners([...banners, nuevo]);

        setTitulo("");
        setImagen("");
        setLink("");
        setOpen(false);
    };

    // 🗑 eliminar
    const eliminarBanner = (id) => {
        setBanners(banners.filter((b) => b.id !== id));
    };

    return (
        <div style={styles.container}>

            {/* HEADER */}
            <div style={styles.header}>
                <h1 style={styles.title}>Banners</h1>

                <button style={styles.button} onClick={() => setOpen(true)}>
                    + Nuevo banner
                </button>
            </div>

            {/* LISTA */}
            <div style={styles.grid}>
                {banners.map((b) => (
                    <div key={b.id} style={styles.card}>

                        <img src={b.imagen} alt={b.titulo} style={styles.img} />

                        <h3>{b.titulo}</h3>

                        <a href={b.link}>Ver link</a>

                        <button
                            style={styles.deleteBtn}
                            onClick={() => eliminarBanner(b.id)}
                        >
                            Eliminar
                        </button>

                    </div>
                ))}
            </div>

            {/* MODAL */}
            {open && (
                <div style={styles.modalBackdrop}>
                    <div style={styles.modal}>

                        <h2>Nuevo banner</h2>

                        <input
                            placeholder="Título"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            style={styles.input}
                        />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];

                                if (!file) return;

                                const reader = new FileReader();

                                reader.onloadend = () => {
                                    setImagen(reader.result); // base64
                                };

                                reader.readAsDataURL(file);
                            }}
                        />

                        <input
                            placeholder="Link"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            style={styles.input}
                        />

                        <button style={styles.saveBtn} onClick={agregarBanner}>
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
        margin: 0
    },

    button: {
        padding: "10px 14px",
        background: "#3b82f6",
        color: "#fff",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer"
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "15px"
    },

    card: {
        background: "#fff",
        padding: "10px",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)"
    },

    img: {
        width: "100%",
        height: "120px",
        objectFit: "cover",
        borderRadius: "8px"
    },

    deleteBtn: {
        marginTop: "10px",
        background: "red",
        color: "#fff",
        border: "none",
        padding: "6px",
        borderRadius: "6px",
        cursor: "pointer"
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