import Home from "../../src/View/Home/Home";
import banner from "../../public/data/banner.json";
import content from "../../public/data/home.json";

export default function Page() {
  return <Home banner={banner} content={content} />;
}
