import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import WhatsAppButton from "../components/WhatsAppButton/WhatsAppButton";

function PublicLayout({ navigation, site }) {
  return (
    <>
      <Navbar data={navigation} />
      <Outlet />
      <WhatsAppButton data={site.whatsapp} />
      <Footer data={site.footer} />
    </>
  );
}

export default PublicLayout;
