import React from "react";
import './WhatsAppButton.css'

const WhatsAppButton = () => {
  const phoneNumber = "569XXXXXXXX"; // tu número en formato internacional Chile

  const message = encodeURIComponent("Hola! Quisiera más información.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      className="whatsapp-button"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat en WhatsApp"
    >
      <img src="/whatsapp-fill.svg" alt="WhatsApp" />
    </a>
  );
};

export default WhatsAppButton;