/** Local calendar day helpers for the orders dashboard date filter. */

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function toDateInputValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {"today"|"yesterday"|"week"|"month"|"custom"} preset
 * @param {string} [customDate] YYYY-MM-DD for custom
 */
export function getOrderRangeBounds(preset, customDate) {
  const now = new Date();

  if (preset === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: startOfDay(y), end: endOfDay(y) };
  }

  if (preset === "week") {
    const start = startOfDay(now);
    const day = start.getDay(); // 0 = Sun
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);
    return { start, end: endOfDay(now) };
  }

  if (preset === "month") {
    const start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    return { start, end: endOfDay(now) };
  }

  if (preset === "custom") {
    const base = customDate ? new Date(`${customDate}T12:00:00`) : now;
    return { start: startOfDay(base), end: endOfDay(base) };
  }

  // today (default)
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function filterOrdersByRange(orders, preset, customDate) {
  const { start, end } = getOrderRangeBounds(preset, customDate);
  const startMs = start.getTime();
  const endMs = end.getTime();
  return (orders || []).filter((order) => {
    const ts = new Date(order.created_at).getTime();
    return ts >= startMs && ts <= endMs;
  });
}

export function summarizeOrders(orders) {
  // Cancelled orders never count toward sales / best-seller
  const list = (orders || []).filter((order) => order.status !== "cancelled");
  const count = list.length;
  const totalSales = list.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const qtyByName = {};
  for (const order of list) {
    for (const item of order.items || []) {
      const name = String(item.name || "").trim();
      if (!name) continue;
      qtyByName[name] = (qtyByName[name] || 0) + Number(item.qty || 0);
    }
  }

  let bestItem = null;
  for (const [name, qty] of Object.entries(qtyByName)) {
    if (!bestItem || qty > bestItem.qty) bestItem = { name, qty };
  }

  return { count, totalSales, bestItem };
}

export function isActiveOrderStatus(status) {
  return status !== "done" && status !== "cancelled";
}

export function getNextOrderStatus(status) {
  if (status === "received" || !status) return "preparing";
  if (status === "preparing") return "done";
  return null;
}
