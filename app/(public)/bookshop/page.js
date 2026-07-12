import Bookshop from "../../../src/View/Bookshop/Bookshop";
import catalogs from "../../../public/data/catalogs.json";

export default function Page() {
  return <Bookshop products={catalogs.bookshop} />;
}
