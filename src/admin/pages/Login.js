import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // login falso por ahora
    if (email && password) {
      localStorage.setItem("auth", "true");
      navigate("/admin/dashboard");
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.card}>
        
        <h2 style={styles.title}>Admin Panel</h2>
        <p style={styles.subtitle}>Inicia sesión para continuar</p>

        <input
          style={styles.input}
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" style={styles.button}>
          Entrar
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a"
  },
  card: {
    width: "320px",
    background: "#111827",
    padding: "30px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)"
  },
  title: {
    color: "#fff",
    margin: 0,
    textAlign: "center"
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "-5px"
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#0b1220",
    color: "#fff",
    outline: "none"
  },
  button: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold"
  }
};