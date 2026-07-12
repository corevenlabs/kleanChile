import Navbar from "../../src/components/Navbar/Navbar";
import Footer from "../../src/components/Footer/Footer";
import WhatsAppButton from "../../src/components/WhatsAppButton/WhatsAppButton";
import navigation from "../../public/data/navigation.json";
import site from "../../public/data/site.json";

export default function PublicLayout({ children }) {
  return <><Navbar data={navigation} />{children}<WhatsAppButton data={site.whatsapp} /><Footer data={site.footer} /></>;
}
