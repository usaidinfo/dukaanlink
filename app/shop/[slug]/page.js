import { createPublicClient } from "../../../lib/supabaseClient";
import { buildShopJsonLd, getSiteUrl, shopDescription, shopTitle } from "../../../lib/seo";
import ShopClient from "./ShopClient";

async function getShop(slug) {
  const supabase = createPublicClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return { business: null, items: [] };

  let { data: items, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("business_id", business.id)
    .order("category", { ascending: true });

  // Newer schemas include sort_order; ignore if the column isn't migrated yet.
  if (error) {
    const retry = await supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", business.id);
    items = retry.data;
  }

  return { business, items: items || [] };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { business, items } = await getShop(slug);
  const siteUrl = getSiteUrl();

  if (!business) {
    return {
      title: "Shop not found | DukaanLink",
      robots: { index: false, follow: false },
    };
  }

  const title = shopTitle(business);
  const description = shopDescription(business, items.length);
  const url = `${siteUrl}/shop/${business.slug}`;
  const image = business.cover_url || business.logo_url || items.find((i) => i.photo_url)?.photo_url;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url,
      title,
      description,
      siteName: "DukaanLink",
      images: image ? [{ url: image, alt: business.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ShopPage({ params }) {
  const { slug } = await params;
  const { business, items } = await getShop(slug);
  const siteUrl = getSiteUrl();

  if (!business) {
    return (
      <div className="mobile-shell">
        <div className="page" style={{ paddingTop: "4rem" }}>
          <h1>Page not found</h1>
          <p className="muted">This link does not match any business page. Check the URL.</p>
        </div>
      </div>
    );
  }

  const jsonLd = buildShopJsonLd(business, items, siteUrl);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ShopClient business={business} items={items} />
    </>
  );
}
