export const QUANTITY_UNITS = [
  { value: "piece", label: "piece" },
  { value: "pair", label: "pair" },
  { value: "set", label: "set" },
  { value: "dozen", label: "dozen" },
  { value: "pack", label: "pack" },
  { value: "packet", label: "packet" },
  { value: "box", label: "box" },
  { value: "bag", label: "bag" },
  { value: "bottle", label: "bottle" },
  { value: "can", label: "can" },
  { value: "plate", label: "plate" },
  { value: "bowl", label: "bowl" },
  { value: "kg", label: "kg" },
  { value: "gram", label: "gram" },
  { value: "litre", label: "litre" },
  { value: "ml", label: "ml" },
  { value: "metre", label: "metre" },
  { value: "cm", label: "cm" },
  { value: "yard", label: "yard" },
  { value: "roll", label: "roll" },
  { value: "bundle", label: "bundle" },
  { value: "sheet", label: "sheet" },
];

/** Map old short units to full labels for display */
const UNIT_LABELS = {
  pcs: "piece",
  g: "gram",
  L: "litre",
  l: "litre",
  m: "metre",
  meter: "metre",
};

/** Stock quantity tracking is useful for food + kirana/retail, not salon/barber etc. */
export function usesItemQuantity(categoryOrMode) {
  const value = String(categoryOrMode || "").toLowerCase();
  if (value === "food" || value === "retail") return true;
  return (
    value.includes("food") ||
    value.includes("kitchen") ||
    value.includes("restaurant") ||
    value.includes("retail") ||
    value.includes("kirana") ||
    value.includes("boutique") ||
    value.includes("shop")
  );
}

export function unitLabel(unit) {
  if (!unit) return "piece";
  return UNIT_LABELS[unit] || unit;
}

export function formatItemQuantity(item) {
  if (item == null || item.quantity == null || item.quantity === "") return "";
  const qty = Number(item.quantity);
  if (Number.isNaN(qty)) return "";
  return `${qty} ${unitLabel(item.quantity_unit)}`;
}

export function parseQuantityInput(value) {
  if (value === "" || value == null) return null;
  const qty = Number(value);
  if (Number.isNaN(qty) || qty < 0) return null;
  return qty;
}
