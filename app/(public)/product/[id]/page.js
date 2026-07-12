import ProductDetail from "../../../../src/View/ProductDetail/ProductDetail";
import products from "../../../../public/data/product-details.json";

export default async function Page({ params }) {
  const { id } = await params;
  return <ProductDetail products={products} id={id} />;
}
