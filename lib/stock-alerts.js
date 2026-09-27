export function isStockTracking(item) {
  if (!item) return false;
  if (item.stock_tracking_enabled === true) return true;
  if (item.stock_tracking_enabled === false) return false;
  return item.quantity != null && item.quantity !== "";
}

export function isLowStock(item) {
  if (!isStockTracking(item) || item.quantity == null || item.alert_below == null) return false;
  return Number(item.quantity) <= Number(item.alert_below);
}

export function crossedLowStockThreshold(prev, next) {
  if (!isStockTracking(next) || next.alert_below == null || next.quantity == null) return false;
  const threshold = Number(next.alert_below);
  if (!Number.isFinite(threshold)) return false;
  const prevQty = prev?.quantity == null ? Number.POSITIVE_INFINITY : Number(prev.quantity);
  const nextQty = Number(next.quantity);
  if (!Number.isFinite(nextQty)) return false;
  return prevQty > threshold && nextQty <= threshold;
}

export function emitLowStockAlert(item) {
  if (typeof window === "undefined" || !item) return;
  window.dispatchEvent(new CustomEvent("dukaanlink-low-stock", { detail: item }));
}

function normalizeItemName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMenuItemForOrderLine(menuItems, line) {
  const candidates = [line?.menu_item_id, line?.item_id];
  const rawId = String(line?.id || "");
  if (rawId.includes("::")) candidates.push(rawId.split("::")[0]);
  else if (rawId) candidates.push(rawId);

  for (const id of candidates) {
    if (!id) continue;
    const match = (menuItems || []).find((row) => row.id === id);
    if (match) return match;
  }

  const target = normalizeItemName(line?.name);
  if (!target) return null;
  return (menuItems || []).find((row) => normalizeItemName(row.name) === target) || null;
}

/** When an order is marked done, subtract sold qty from tracked items. */
export async function deductStockForCompletedOrder(client, businessId, orderItems) {
  const lines = Array.isArray(orderItems) ? orderItems : [];
  if (!client || !businessId || !lines.length) return [];

  const { data: menuItems, error } = await client
    .from("menu_items")
    .select("id, name, quantity, quantity_unit, alert_below, stock_tracking_enabled, business_id")
    .eq("business_id", businessId);

  if (error || !menuItems?.length) return [];

  const soldById = new Map();
  for (const line of lines) {
    const item = findMenuItemForOrderLine(menuItems, line);
    if (!item || !isStockTracking(item) || item.quantity == null) continue;
    const sold = Number(line.qty);
    if (!Number.isFinite(sold) || sold <= 0) continue;
    soldById.set(item.id, (soldById.get(item.id) || 0) + sold);
  }

  const updated = [];
  for (const [itemId, sold] of soldById) {
    const item = menuItems.find((row) => row.id === itemId);
    const current = Number(item.quantity) || 0;
    const nextQty = Math.max(0, Math.round((current - sold) * 100) / 100);
    const nextItem = { ...item, quantity: nextQty };
    const { error: updateError } = await client
      .from("menu_items")
      .update({ quantity: nextQty })
      .eq("id", itemId);
    if (updateError) continue;
    if (crossedLowStockThreshold(item, nextItem)) {
      emitLowStockAlert(nextItem);
    }
    updated.push(nextItem);
  }
  return updated;
}
