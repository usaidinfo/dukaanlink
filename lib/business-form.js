import { emptyOpeningHours } from "../components/opening-hours-fields";

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const EMPTY_BUSINESS_FORM = {
  name: "",
  category: "Food & home kitchen",
  whatsapp_number: "",
  city: "",
  address: "",
  description: "",
  cover_url: "",
  logo_url: "",
  payment_qr_url: "",
  upi_id: "",
  payment_mode: "both",
  opening_hours: emptyOpeningHours(),
  seo_title: "",
  seo_description: "",
};

export function businessToForm(business) {
  return {
    name: business.name || "",
    category: business.category || "Food & home kitchen",
    whatsapp_number: business.whatsapp_number || "",
    city: business.city || "",
    address: business.address || "",
    description: business.description || "",
    cover_url: business.cover_url || "",
    logo_url: business.logo_url || "",
    payment_qr_url: business.payment_qr_url || "",
    upi_id: business.upi_id || "",
    payment_mode: business.payment_mode || "both",
    opening_hours: business.opening_hours || null,
    seo_title: business.seo_title || "",
    seo_description: business.seo_description || "",
  };
}

export function buildBusinessPayload(form, hoursPayload) {
  return {
    name: form.name,
    category: form.category || null,
    whatsapp_number: form.whatsapp_number,
    city: form.city || null,
    address: form.address || null,
    description: form.description || null,
    cover_url: form.cover_url || null,
    logo_url: form.logo_url || null,
    payment_qr_url: form.payment_qr_url || null,
    upi_id: form.upi_id?.trim() || null,
    payment_mode: form.payment_mode || "both",
    opening_hours: hoursPayload,
    seo_title: form.seo_title || null,
    seo_description: form.seo_description || null,
  };
}

export function getCategoryOptions(t) {
  return [
    { value: "Food & home kitchen", label: t("dashboard.foodType") },
    { value: "Salon / spa", label: t("dashboard.salonType") },
    { value: "Tuition / coaching", label: t("dashboard.tuitionType") },
    { value: "Retail / kirana", label: t("dashboard.shopType") },
    { value: "Boutique / gifts", label: t("dashboard.boutiqueType") },
    { value: "Tailor & local services", label: t("dashboard.serviceType") },
    { value: "Other", label: t("dashboard.otherType") },
  ];
}
