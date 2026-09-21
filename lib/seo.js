import { getBusinessMode } from "./business-config";

/**
 * Builds absolute site URL for SEO / OG tags.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://dukaanlink.in).
 */
export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function shopTitle(business) {
  if (business.seo_title?.trim()) return business.seo_title.trim().slice(0, 70);
  const city = business.city ? ` in ${business.city}` : "";
  const cat = business.category ? ` | ${business.category}` : "";
  return `${business.name}${city}${cat} — WhatsApp catalog | DukaanLink`;
}

export function shopDescription(business, itemCount = 0) {
  if (business.seo_description?.trim()) return business.seo_description.trim().slice(0, 160);
  if (business.description) return business.description.slice(0, 160);
  const where = business.city ? ` in ${business.city}` : "";
  const cat = business.category ? ` ${business.category}` : " local business";
  const count = itemCount > 0 ? ` Browse ${itemCount} items.` : "";
  const mode = getBusinessMode(business.category);
  const action =
    mode === "food"
      ? "WhatsApp ordering"
      : mode === "retail"
        ? "WhatsApp enquiries"
        : mode === "education"
          ? "course enquiries on WhatsApp"
          : "WhatsApp booking";
  return `${business.name}${where} —${cat} catalog with ${action}.${count} No app download.`;
}

/** JSON-LD for Google — OfferCatalog works for food, salon, tuition, retail, services. */
export function buildShopJsonLd(business, items, siteUrl) {
  const pageUrl = `${siteUrl}/shop/${business.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: shopDescription(business, items.length),
    url: pageUrl,
    image: business.logo_url || business.cover_url || undefined,
    telephone: business.whatsapp_number
      ? `+${String(business.whatsapp_number).replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`
      : undefined,
    address: business.address || business.city
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address || undefined,
          addressLocality: business.city || undefined,
          addressCountry: "IN",
        }
      : undefined,
    areaServed: business.city || undefined,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${business.name} catalog`,
      itemListElement: items.map((i) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Product",
          name: i.name,
          description: i.description || undefined,
          image: i.photo_url || undefined,
          category: i.category || undefined,
        },
        price: Number(i.price),
        priceCurrency: "INR",
        availability: i.in_stock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      })),
    },
  };
}
