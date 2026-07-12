import Desktop from "../../../src/View/Desktop/Desktop";
import catalogs from "../../../public/data/catalogs.json";

export default function Page() {
  return <Desktop products={catalogs.desktop} />;
}
