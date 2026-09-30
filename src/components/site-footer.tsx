import Link from "next/link";

const columns = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQs", href: "/help" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "Our atelier", href: "/about" },
      { label: "Craftsmanship", href: "/about/craft" },
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Book an appointment", href: "/appointments" },
      { label: "Personalisation", href: "/personalisation" },
      { label: "Gift wrapping", href: "/gifts" },
      { label: "Repairs", href: "/repairs" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of sale", href: "/legal/terms" },
      { label: "Accessibility", href: "/legal/accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="container-bleed grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-4 md:py-16">
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="mb-4 text-label">{column.title}</h2>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-muted">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container-bleed flex flex-col items-center gap-3 border-t border-line py-8">
        <span className="wordmark">Atelier</span>
        <p className="text-caption text-muted">
          © {new Date().getFullYear()} Atelier. Sample storefront.
        </p>
      </div>
    </footer>
  );
}
