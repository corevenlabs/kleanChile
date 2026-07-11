import { Link, useParams } from "react-router-dom";
import "./ProductDetail.css";

const labels = {
  marca: "Marca", advertencias_almacenamiento: "Advertencias de Almacenamiento", advertencias_uso: "Advertencias de Uso",
  beneficios_uso: "Beneficios de Uso", contenido_neto: "Contenido Neto", denominacion_variedad: "Denominación/Variedad",
  modo_uso: "Modo de Uso", tipo_producto: "Tipo de Producto", concentrado: "Concentrado",
  unidades_por_paquete: "Unidades por Paquete", estado_producto: "Estado de Producto", formato: "Formato",
  presentacion_empaque: "Presentación/Empaque",
};
const formatKey = (key) => labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function ProductDetail({ products }) {
  const { id } = useParams();
  const product = products.find((item) => item.id === Number(id));
  if (!product) return <div className="product-page"><h2>Producto no encontrado</h2><Link to="/">Volver al inicio</Link></div>;

  return <div className="product-page"><div className="breadcrumb"><Link to="/">Inicio</Link> / Producto</div><div className="product-layout">
    <div className="product-image-box"><div className="product-image-wrapper"><img src={product.image} alt={product.name} /></div></div>
    <div className="product-info"><h1>{product.name}</h1><div className="price">${product.price.toLocaleString("es-CL")}</div><div className="description-section"><p className="description">{product.description}</p></div>
      <div className="specs-section"><div className="specs-header"><h3>Especificaciones</h3><button className="download-btn">📄 Descargar ficha técnica</button></div><div className="specs-grid">{Object.entries(product.especificaciones).map(([key, value]) => <div className="specs-row" key={key}><span className="specs-key">{formatKey(key)}</span><span className="specs-value">{value}</span></div>)}</div></div>
    </div>
  </div></div>;
}
