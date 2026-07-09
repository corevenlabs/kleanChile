import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import WhatsAppButton from "../components/WhatsAppButton/WhatsAppButton";

function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <WhatsAppButton />
      <Footer />
    </>
  );
}

export default PublicLayout;