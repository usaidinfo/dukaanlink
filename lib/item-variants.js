export const VARIANT_TYPES = ["size", "color", "weight", "pack_size", "custom"];

export const VARIANT_PRESETS = {
  size: ["XS", "S", "M", "L", "XL", "XXL", "Free Size"],
  weight: ["250g", "500g", "1kg", "2kg"],
  pack_size: ["Pack of 6", "Pack of 12", "Pack of 24"],
};

export function sortVariants(list) {
  return [...(list || [])].sort((a, b) => {
    const typeA = VARIANT_TYPES.indexOf(a.variant_type);
    const typeB = VARIANT_TYPES.indexOf(b.variant_type);
    if (typeA !== typeB) return typeA - typeB;
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
}

export function groupVariantsByType(list) {
  const groups = {};
  for (const type of VARIANT_TYPES) groups[type] = [];
  for (const variant of sortVariants(list)) {
    if (!groups[variant.variant_type]) groups[variant.variant_type] = [];
    groups[variant.variant_type].push(variant);
  }
  return groups;
}

export function itemHasVariants(item) {
  return Array.isArray(item?.item_variants) && item.item_variants.length > 0;
}

export function isItemPurchasable(item) {
  if (!item?.in_stock) return false;
  if (!itemHasVariants(item)) return true;
  return item.item_variants.some((row) => row.in_stock);
}

export function defaultInStockVariant(variants) {
  const list = sortVariants(variants);
  return list.find((row) => row.in_stock) || list[0] || null;
}

export function formatItemNameWithVariant(itemName, variant) {
  const label = String(variant?.label || "").trim();
  if (!label) return itemName;
  return `${itemName} (${label})`;
}

export function cartLineKey(itemId, variantId) {
  return variantId ? `${itemId}::${variantId}` : itemId;
}

export function parseCartLineKey(key) {
  const [itemId, variantId] = String(key || "").split("::");
  return { itemId, variantId: variantId || null };
}

export function itemPriceRange(item) {
  const variants = (item?.item_variants || []).filter((row) => row.price != null && row.price !== "");
  if (!variants.length) return { min: Number(item?.price || 0), max: Number(item?.price || 0) };
  const prices = variants.map((row) => Number(row.price));
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function newDraftVariant(type, label, colorHex = null) {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variant_type: type,
    label: String(label || "").trim(),
    color_hex: type === "color" ? colorHex || "#e11d48" : null,
    price: "",
    in_stock: true,
    sort_order: Date.now() % 100000,
    isNew: true,
  };
}

export function isPersistedVariantId(id) {
  return Boolean(id) && !String(id).startsWith("new-");
}
