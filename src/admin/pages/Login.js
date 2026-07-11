import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/admin.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const login = (event) => { event.preventDefault(); if (!email || !password) return; localStorage.setItem("auth", "true"); navigate("/admin/dashboard"); };
  return <main className="admin-login"><section className="admin-login__card"><Link to="/" className="admin-login__brand"><span>K</span><strong>KleanChile</strong></Link><div className="admin-login__intro"><p className="admin-kicker">PANEL DE ADMINISTRACIÓN</p><h1>Bienvenido</h1><p>Ingresa para gestionar el contenido de tu sitio.</p></div><form onSubmit={login}><label>Correo electrónico<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kleanchile.cl" /></label><label>Contraseña<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label><button className="admin-button">Ingresar al panel</button></form><small className="admin-login__hint">Acceso de demostración: utiliza cualquier correo y contraseña.</small></section><aside className="admin-login__visual"><div><span>GESTIÓN SIMPLE</span><h2>Tu sitio, siempre actualizado.</h2><p>Productos, banners y datos comerciales desde una interfaz limpia y fácil de usar.</p></div></aside></main>;
}
