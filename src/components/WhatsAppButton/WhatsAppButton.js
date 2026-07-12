import React from "react";

const WhatsAppButton = ({ data }) => {
  const whatsappUrl = `https://wa.me/${data.phoneNumber}?text=${encodeURIComponent(data.message)}`;

  return (
    <a
      href={whatsappUrl}
      className="whatsapp-button"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={data.ariaLabel}
    >
      <img src={data.icon} alt={data.alt} />
    </a>
  );
};

export default WhatsAppButton;
