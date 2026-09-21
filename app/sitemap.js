import { createPublicClient } from "../lib/supabaseClient";
import { getSiteUrl } from "../lib/seo";

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const supabase = createPublicClient();

  const staticRoutes = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const { data: shops } = await supabase
    .from("businesses")
    .select("slug, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  const shopRoutes = (shops || []).map((shop) => ({
    url: `${siteUrl}/shop/${shop.slug}`,
    lastModified: shop.created_at ? new Date(shop.created_at) : new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...shopRoutes];
}
