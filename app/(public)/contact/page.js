import Contact from "../../../src/View/Contact/Contact";
import { getContent } from "../../../src/infra/db/queries/content.js";

export const metadata = { title: "Contacto" };

export default async function Page() {
  const content = await getContent();

  return <Contact footer={content.footer} whatsapp={content.whatsapp} />;
}
