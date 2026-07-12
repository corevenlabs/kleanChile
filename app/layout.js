import "../src/index.css";
import "../src/View/Banner/Banner.css";
import "../src/View/Home/Home.css";
import "../src/View/Cleaning/Cleaning.css";
import "../src/View/Bookshop/Bookshop.css";
import "../src/View/Desktop/Desktop.css";
import "../src/View/Contact/Contact.css";
import "../src/View/ProductDetail/ProductDetail.css";
import "../src/components/Navbar/Navbar.css";
import "../src/components/Footer/Footer.css";
import "../src/components/WhatsAppButton/WhatsAppButton.css";
import "../src/components/BestSellers/BestSellers.css";
import "../src/components/BrandSlider/BrandSlider.css";
import "../src/components/DualBanner/DualBanner.css";
import "../src/components/WhyUs/WhyUs.css";
import "../src/components/Testimonials/Testimonials.css";
import "../src/admin/styles/admin.css";

export const metadata = {
  title: "KleanChile",
  description: "Productos de limpieza, librería y escritorio",
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
