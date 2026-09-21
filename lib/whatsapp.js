// Builds a wa.me deep link with a pre-filled order message.
// No WhatsApp Business API needed for v1 - this just opens WhatsApp
// with the message already typed out, ready for the customer to hit send.

const copy = {
  en: {
    intro: {
      order: "New Order",
      enquiry: "New Enquiry",
      booking: "New Booking",
    },
    total: "Total",
    note: "Note",
    customer: "Customer",
    prepaid:
      "I am paying in advance. I will also send the payment screenshot on WhatsApp.",
    footer: {
      order: "Please confirm preparation & delivery time!",
      enquiry: "Please share details on availability and next steps.",
      booking: "Please confirm the timing and next steps.",
    },
  },
  hi: {
    intro: {
      order: "नया ऑर्डर",
      enquiry: "नई पूछताछ",
      booking: "नई बुकिंग",
    },
    total: "कुल",
    note: "नोट",
    customer: "ग्राहक",
    prepaid:
      "मैं पहले से भुगतान कर रहा/रही हूँ। भुगतान का स्क्रीनशॉट भी WhatsApp पर भेजूंगा/भेजूंगी।",
    footer: {
      order: "कृपया तैयारी और डिलीवरी समय बताएं।",
      enquiry: "कृपया उपलब्धता और आगे की जानकारी भेजें।",
      booking: "कृपया समय और आगे की जानकारी बताएं।",
    },
  },
};

export function toWhatsAppDigits(whatsappNumber) {
  let digits = String(whatsappNumber || "").replace(/\D/g, "");

  // 09876543210 → 9876543210
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Already India format: 91 + 10 digits
  if (/^91\d{10}$/.test(digits)) return digits;

  // Plain 10-digit mobile
  if (/^\d{10}$/.test(digits)) return `91${digits}`;

  return digits;
}

/** Accepts 10-digit, 91XXXXXXXXXX, or +91 XXXXXXXXXX */
export function isValidIndianWhatsApp(whatsappNumber) {
  const digits = toWhatsAppDigits(whatsappNumber);
  return /^91[6-9]\d{9}$/.test(digits);
}

export function buildWhatsAppOrderLink(
  whatsappNumber,
  cartItems,
  total,
  customerNote,
  locale = "en",
  businessName = "",
  messageType = "order",
  prepaid = false,
  customerName = ""
) {
  const digits = toWhatsAppDigits(whatsappNumber);
  const text = copy[locale] || copy.en;
  const lines = [
    `*${text.intro[messageType] || text.intro.order}${businessName ? ` for ${businessName}` : ""}*`,
    "-------------------------",
    ...cartItems.map((item) => `${item.qty}x ${item.name} - ₹${item.price * item.qty}`),
    "-------------------------",
    `*${text.total}: ₹${total}*`,
  ];
  if (customerName) lines.push("", `*${text.customer}:* ${customerName}`);
  if (customerNote) lines.push("", `*${text.note}:* ${customerNote}`);
  if (prepaid) lines.push("", `*Payment:* ${text.prepaid}`);
  lines.push("", `_${text.footer[messageType] || text.footer.order}_`);

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${digits}?text=${message}`;
}

/** Owner → customer quick reply (no WhatsApp Business API). */
export function buildWhatsAppReplyLink(customerWhatsapp, messageText) {
  const digits = toWhatsAppDigits(customerWhatsapp);
  const message = encodeURIComponent(String(messageText || "").trim());
  if (digits.length >= 11) {
    return `https://wa.me/${digits}?text=${message}`;
  }
  // Fallback: open WhatsApp with text only; owner picks the chat
  return `https://wa.me/?text=${message}`;
}

/** Open WhatsApp with pre-filled text; owner picks the recipient. */
export function buildWhatsAppShareLink(messageText) {
  const message = encodeURIComponent(String(messageText || "").trim());
  return `https://api.whatsapp.com/send?text=${message}`;
}

const dailySummaryCopy = {
  en: {
    title: "{name} - Today's Summary ({date})",
    orders: "Orders: {count}",
    sales: "Sales: ₹{total}",
    best: "Best seller: {item} ({qty} sold)",
    bestEmpty: "Best seller: —",
  },
  hi: {
    title: "{name} - आज का सारांश ({date})",
    orders: "ऑर्डर्स: {count}",
    sales: "सेल्स: ₹{total}",
    best: "सबसे ज्यादा बिका: {item} ({qty} बिके)",
    bestEmpty: "सबसे ज्यादा बिका: —",
  },
};

function fillTemplate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    values[key] != null ? String(values[key]) : ""
  );
}

/** Plain-text daily sales summary for WhatsApp share (en / hi). */
export function buildDailySummaryMessage(
  { businessName, dateLabel, count, totalSales, bestItem },
  locale = "en"
) {
  const text = dailySummaryCopy[locale] || dailySummaryCopy.en;
  const lines = [
    fillTemplate(text.title, {
      name: businessName || "DukaanLink",
      date: dateLabel,
    }),
    fillTemplate(text.orders, { count: Number(count) || 0 }),
    fillTemplate(text.sales, { total: Number(totalSales) || 0 }),
  ];

  if (bestItem?.name) {
    lines.push(
      fillTemplate(text.best, {
        item: bestItem.name,
        qty: Number(bestItem.qty) || 0,
      })
    );
  } else {
    lines.push(text.bestEmpty);
  }

  return lines.join("\n");
}
