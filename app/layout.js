import { IBM_Plex_Mono, IBM_Plex_Sans, Poppins } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, siteUrl } from "../src/lib/site.js";

// Tokens first: every stylesheet below reads from them.
import "../src/styles/brand.css";
import "../src/index.css";
import "../src/View/Banner/Banner.css";
import "../src/View/Home/Home.css";
import "../src/styles/catalog.css";
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
import "../src/components/cart/cart.css";
import "../src/admin/styles/admin.css";

/**
 * Three faces, three jobs — see the type notes in `styles/brand.css`.
 *
 * Only the weights actually used are requested. `display: swap` so text is
 * readable while the files arrive, which matters more here than avoiding a
 * reflow: this is a catalogue people scan.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "600", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/**
 * The tab icon comes from `app/icon.png` and `app/apple-icon.png`, which Next
 * discovers by filename and links itself — see `scripts/build-logo-assets.js`.
 * There is no `icons` key here on purpose: naming them twice is how one of the
 * two ends up pointing at a file that was renamed.
 *
 * The template is what makes a tab readable when six of them are open. A page
 * that sets nothing keeps the full default line.
 */
const title = "KleanChile — Soluciones de limpieza y oficina para instituciones";

export const metadata = {
  /*
   * Every relative URL in metadata resolves against this. Without it Next drops
   * `og:image` rather than emitting a relative one, which is why the site
   * previewed as a bare link everywhere it was shared.
   */
  metadataBase: new URL(siteUrl()),
  title: { default: title, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  /*
   * WhatsApp is the checkout here, so a shared link has to preview properly —
   * it is the first impression of the shop far more often than a Google result
   * is. WhatsApp reads Open Graph and ignores Twitter tags; the Twitter block
   * is for X and for the several apps that only read those.
   */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "es_CL",
    url: "/",
    title,
    description: SITE_DESCRIPTION,
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: SITE_DESCRIPTION,
    images: ["/brand/og.png"],
  },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${poppins.variable} ${plex.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
