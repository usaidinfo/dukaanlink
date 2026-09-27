export const GST_RATES = [0, 5, 12, 18, 28];
export const GST_MODES = ["included", "excluded", "no_gst"];

export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function normalizeGst(item) {
  const mode = GST_MODES.includes(item?.gst_mode) ? item.gst_mode : "no_gst";
  const rate = mode === "no_gst" ? null : Number(item?.gst_rate);
  return {
    gst_mode: mode,
    gst_rate: Number.isFinite(rate) ? rate : mode === "no_gst" ? null : 18,
  };
}

/** One cart line: price is the listed unit price (variant or item). */
export function lineGst({ price, qty, gst_mode, gst_rate }) {
  const { gst_mode: mode, gst_rate: rate } = normalizeGst({ gst_mode, gst_rate });
  const listed = roundMoney(Number(price || 0) * Number(qty || 0));

  if (mode === "included" && rate > 0) {
    const base = roundMoney(listed / (1 + rate / 100));
    return { base, gst: roundMoney(listed - base), total: listed, mode, rate };
  }

  if (mode === "excluded" && rate > 0) {
    const gst = roundMoney(listed * (rate / 100));
    return { base: listed, gst, total: roundMoney(listed + gst), mode, rate };
  }

  return { base: listed, gst: 0, total: listed, mode, rate: 0 };
}

export function summarizeCartGst(cartItems) {
  return (cartItems || []).reduce(
    (acc, item) => {
      const line = lineGst(item);
      acc.subtotal = roundMoney(acc.subtotal + line.base);
      acc.gst = roundMoney(acc.gst + line.gst);
      acc.total = roundMoney(acc.total + line.total);
      acc.hasGst = acc.hasGst || line.gst > 0 || line.mode === "included" || line.mode === "excluded";
      return acc;
    },
    { subtotal: 0, gst: 0, total: 0, hasGst: false }
  );
}

export function formatMoney(value) {
  const n = roundMoney(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function gstNote(item, locale = "en") {
  const { gst_mode, gst_rate } = normalizeGst(item);
  if (gst_mode === "included" && gst_rate != null) {
    return locale === "hi" ? `(GST @${gst_rate}% शामिल)` : `(incl. GST @${gst_rate}%)`;
  }
  if (gst_mode === "excluded" && gst_rate != null) {
    return locale === "hi" ? `+ ${gst_rate}% GST` : `+ ${gst_rate}% GST`;
  }
  return "";
}
