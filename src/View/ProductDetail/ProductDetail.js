import { useParams, Link } from "react-router-dom";
import "./ProductDetail.css";

const PRODUCTS = [
  {
    id: 1,
    name: "Lavalozas Excell Desengrasante Biodegradable Limón 750 cc",
    price: 12000,
    image:
      "https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600",
    description: `El Lavalozas Excell Desengrasante Biodegradable Limón 750 cc es una solución eficaz para la limpieza diaria de vajilla, utensilios de cocina, cristalería y superficies lavables que requieren una acción desengrasante potente. Su fórmula está diseñada para remover residuos de grasa y suciedad adherida, facilitando el lavado y contribuyendo a obtener resultados limpios y brillantes en cada uso.

Su agradable fragancia a limón aporta una sensación de frescura durante y después del lavado, ayudando a neutralizar olores asociados a restos de alimentos y preparación de comidas. Además, su formulación biodegradable contribuye a una limpieza más responsable con el medio ambiente, ofreciendo una alternativa práctica para hogares, oficinas, casinos, cafeterías, restaurantes y otros espacios donde se realizan tareas frecuentes de lavado.

La presentación de 750 cc proporciona un rendimiento adecuado para el uso cotidiano, permitiendo afrontar múltiples ciclos de lavado con una dosificación eficiente. Su acción limpiadora genera una espuma que facilita la remoción de residuos y mejora la experiencia de limpieza.`,
    especificaciones: {
      marca: "EXCELL",
      advertencias_almacenamiento: "Almacenar en lugar seco y fresco",
      advertencias_uso: "Evite el contacto con los ojos. En caso de contacto, enjuague con abundante agua y consulte su médico.",
      beneficios_uso: "Más rendimiento por cada gota, haciendo que la limpieza sea eficiente y económica.",
      contenido_neto: "750 cc",
      denominacion_variedad: "Desengrasante Biodegradable",
      modo_uso: "Aplique una pequeña dosis en una esponja, lave y enjuague. Mantenga el envase cerrado en un ambiente fresco, seco y en posición vertical para evitar derrames.",
      tipo_producto: "Lavalozas",
      concentrado: "Sí",
      unidades_por_paquete: "1.00",
      estado_producto: "DISPONIBLE",
      formato: "Líquido",
      presentacion_empaque: "Botella",
    },
  },
  {
    id: 2,
    name: "Desinfectante Multiuso Excell",
    price: 8500,
    image:
      "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600",
    description: `Desinfectante multiuso de alta eficacia para eliminar microorganismos en diferentes superficies. Su fórmula avanzada proporciona una limpieza profunda y desinfección completa en hogares, oficinas y espacios comerciales.

Ideal para superficies como pisos, mesas, baños, cocinas y áreas de alto contacto. Su acción antibacterial elimina el 99.9% de bacterias y virus, brindando protección duradera.`,
    especificaciones: {
      marca: "EXCELL",
      advertencias_almacenamiento: "Almacenar en lugar seco y fresco",
      advertencias_uso: "No ingerir. Evitar contacto directo con ojos.",
      beneficios_uso: "Elimina el 99.9% de bacterias y virus",
      contenido_neto: "1 L",
      denominacion_variedad: "Desinfectante Multiuso",
      modo_uso: "Aplicar sobre superficie limpia y dejar actuar 5 minutos",
      tipo_producto: "Desinfectante",
      concentrado: "No",
      unidades_por_paquete: "1.00",
      estado_producto: "DISPONIBLE",
      formato: "Líquido",
      presentacion_empaque: "Botella",
    },
  },
];

// Función para formatear las claves
const formatKey = (key) => {
  const translations = {
    marca: "Marca",
    advertencias_almacenamiento: "Advertencias de Almacenamiento",
    advertencias_uso: "Advertencias de Uso",
    beneficios_uso: "Beneficios de Uso",
    contenido_neto: "Contenido Neto",
    denominacion_variedad: "Denominación/Variedad",
    modo_uso: "Modo de Uso",
    tipo_producto: "Tipo de Producto",
    concentrado: "Concentrado",
    unidades_por_paquete: "Unidades por Paquete",
    estado_producto: "Estado de Producto",
    formato: "Formato",
    presentacion_empaque: "Presentación/Empaque",
  };
  return translations[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

export default function ProductDetail() {
  const { id } = useParams();
  const product = PRODUCTS.find((item) => item.id === Number(id));

  if (!product) {
    return (
      <div className="product-page">
        <h2>Producto no encontrado</h2>
        <Link to="/">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="product-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">Inicio</Link> / Producto
      </div>

      <div className="product-layout">
        {/* IMAGEN */}
        <div className="product-image-box">
          <div className="product-image-wrapper">
            <img src={product.image} alt={product.name} />
          </div>
        </div>

        {/* INFORMACIÓN */}
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="price">
            ${product.price.toLocaleString("es-CL")}
          </div>

          {/* DESCRIPCIÓN */}
          <div className="description-section">
            <p className="description">{product.description}</p>
          </div>

          {/* ESPECIFICACIONES */}
          <div className="specs-section">
            <div className="specs-header">
              <h3>Especificaciones</h3>
              <button className="download-btn">
                📄 Descargar ficha técnica
              </button>
            </div>
            
            <div className="specs-grid">
              {Object.entries(product.especificaciones).map(([key, value]) => (
                <div className="specs-row" key={key}>
                  <span className="specs-key">{formatKey(key)}</span>
                  <span className="specs-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}