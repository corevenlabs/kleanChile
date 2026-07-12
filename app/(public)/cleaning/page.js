import Cleaning from "../../../src/View/Cleaning/Cleaning";
import catalogs from "../../../public/data/catalogs.json";

export default function Page() {
  return <Cleaning products={catalogs.cleaning} />;
}
