import "./globals.css";
import { getSiteUrl } from "../lib/seo";
import { I18nProvider } from "../components/i18n-provider";

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DukaanLink — Your catalog on WhatsApp.",
    template: "%s | DukaanLink",
  },
  description:
    "Give any local business a simple catalog link and QR. Customers order or enquire on WhatsApp with no app download.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "DukaanLink",
    title: "DukaanLink — Your catalog on WhatsApp.",
    description: "Simple digital catalog + QR for local businesses. Orders and enquiries go to WhatsApp.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DukaanLink",
    description: "Your catalog on WhatsApp.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
