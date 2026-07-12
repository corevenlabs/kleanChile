"use client";

import { useState } from "react";
import { useAdmin } from "../context/AdminContext";

export default function Configuraciones() {
  const { settings, saveSettings, clearContent } = useAdmin();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const footer = form.footer;
  const whatsapp = form.whatsapp;
  const updateFooter = (values) => setForm((current) => ({ ...current, footer: { ...current.footer, ...values } }));
  const submit = (event) => { event.preventDefault(); saveSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2200); };
  return <section className="admin-page"><header className="admin-page__header"><div><p className="admin-kicker">AJUSTES DEL SITIO</p><h1>Configuración</h1><p>Información comercial, contacto y canales de atención.</p></div>{saved && <span className="admin-saved">✓ Cambios guardados</span>}</header>
    <form onSubmit={submit} className="admin-settings"><article className="admin-panel"><div className="admin-panel__head"><div><h2>Identidad del negocio</h2><p>Información visible en el pie de página.</p></div></div><div className="admin-form-grid"><label>Nombre comercial<input value={footer.brand} onChange={(e) => updateFooter({ brand: e.target.value })} /></label><label className="wide">Descripción<textarea rows="3" value={footer.description} onChange={(e) => updateFooter({ description: e.target.value })} /></label></div></article>
      <article className="admin-panel"><div className="admin-panel__head"><div><h2>Contacto</h2><p>Datos para que los clientes puedan encontrarte.</p></div></div><div className="admin-form-grid"><label>Correo<input type="email" value={footer.contact.items[0]} onChange={(e) => updateFooter({ contact: { ...footer.contact, items: [e.target.value, footer.contact.items[1], footer.contact.items[2]] } })} /></label><label>Teléfono<input value={footer.contact.items[1]} onChange={(e) => updateFooter({ contact: { ...footer.contact, items: [footer.contact.items[0], e.target.value, footer.contact.items[2]] } })} /></label><label className="wide">Ubicación<input value={footer.contact.items[2]} onChange={(e) => updateFooter({ contact: { ...footer.contact, items: [footer.contact.items[0], footer.contact.items[1], e.target.value] } })} /></label></div></article>
      <article className="admin-panel"><div className="admin-panel__head"><div><h2>WhatsApp</h2><p>Configura el botón flotante del sitio.</p></div></div><div className="admin-form-grid"><label>Número internacional<input value={whatsapp.phoneNumber} onChange={(e) => setForm({ ...form, whatsapp: { ...whatsapp, phoneNumber: e.target.value } })} /></label><label className="wide">Mensaje inicial<textarea rows="3" value={whatsapp.message} onChange={(e) => setForm({ ...form, whatsapp: { ...whatsapp, message: e.target.value } })} /></label></div></article>
      <div className="admin-settings__actions"><button type="button" className="admin-button admin-button--secondary" onClick={() => { if (window.confirm("¿Vaciar todo el contenido del panel?")) { clearContent(); window.location.reload(); } }}>Vaciar contenido</button><button className="admin-button">Guardar configuración</button></div>
    </form>
  </section>;
}
