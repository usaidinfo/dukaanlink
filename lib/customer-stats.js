import { toWhatsAppDigits } from "./whatsapp";

/** Count orders this calendar month per customer WhatsApp (India digits). */
export function buildMonthlyRepeatMap(orders, now = new Date()) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const map = {};

  for (const order of orders || []) {
    const phone = toWhatsAppDigits(order.customer_whatsapp);
    if (!/^91\d{10}$/.test(phone)) continue;

    const created = new Date(order.created_at);
    if (created.getMonth() !== month || created.getFullYear() !== year) continue;

    if (!map[phone]) {
      map[phone] = { count: 0, name: "" };
    }
    map[phone].count += 1;
    const name = String(order.customer_name || "").trim();
    if (name) map[phone].name = name;
  }

  return map;
}

export function formatRepeatLabel(t, { name, count }) {
  if (!count || count < 2) {
    return name ? t("orders.customerNamed").replace("{name}", name) : "";
  }
  if (name) {
    return t("orders.repeatNamed")
      .replace("{name}", name)
      .replace("{count}", String(count));
  }
  return t("orders.repeatAnonymous").replace("{count}", String(count));
}
