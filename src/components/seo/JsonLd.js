/**
 * Renders a Schema.org payload into the page.
 *
 * `<` is escaped because the payload carries admin-entered text — a product
 * description containing `</script>` would otherwise end the block early and
 * put the rest of the JSON into the document as markup. React does not escape
 * inside `dangerouslySetInnerHTML`, and this is the one place the site puts
 * database content somewhere HTML-sensitive.
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
