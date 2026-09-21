import { getSiteUrl } from "../lib/seo";

export default function robots() {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/login", "/signin", "/signup"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
