const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const data = JSON.parse(
  fs.readFileSync(path.join(root, "starter-catalog-kirana-complete.json"), "utf8")
);
const items = data.map(({ id, name, name_hi, category, image_url }) => ({
  id,
  name,
  name_hi,
  category,
  image_url: image_url || "",
}));
const cats = [...new Set(items.map((item) => item.category))];

const file = `const KIRANA_STARTER_ITEMS = ${JSON.stringify(items, null, 2)};

export const KIRANA_STARTER_CATEGORIES = ${JSON.stringify(cats, null, 2)};

export const KIRANA_CATEGORY_I18N = {
  "Staples & Grains": "starterCatStaples",
  "Dals & Pulses": "starterCatDals",
  "Oils & Ghee": "starterCatOils",
  "Sugar, Salt & Sweeteners": "starterCatSugar",
  "Spices": "starterCatSpices",
  "Dairy & Bakery": "starterCatDairy",
  "Tea, Coffee & Drinks": "starterCatDrinks",
  "Biscuits & Snacks": "starterCatSnacks",
  "Dry Fruits": "starterCatDryFruits",
  "Fresh Vegetables": "starterCatVeg",
  "Sauces & Pickles": "starterCatSauces",
  "Household & Cleaning": "starterCatHome",
  "Personal Care": "starterCatCare",
};

export function isKiranaStarterShop(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("boutique") || value.includes("gift")) return false;
  return value.includes("kirana") || value.includes("retail");
}

export function kiranaItemLabel(item, locale) {
  if (locale === "hi") return item.name_hi || item.name;
  return item.name;
}

export function remainingKiranaStarter(existingItems = []) {
  const taken = new Set(
    (existingItems || []).flatMap((row) => {
      const name = String(row?.name || "").trim().toLowerCase();
      return name ? [name] : [];
    })
  );
  return KIRANA_STARTER_ITEMS.filter((item) => {
    const en = String(item.name || "").trim().toLowerCase();
    const hi = String(item.name_hi || "").trim().toLowerCase();
    return !taken.has(en) && !(hi && taken.has(hi));
  });
}

export function groupKiranaStarter(items, query = "") {
  const q = String(query || "").trim().toLowerCase();
  const filtered = !q
    ? items
    : items.filter((item) => {
        const hay = \`\${item.name} \${item.name_hi} \${item.category}\`.toLowerCase();
        return hay.includes(q);
      });
  const map = new Map();
  for (const item of filtered) {
    if (!map.has(item.category)) map.set(item.category, []);
    map.get(item.category).push(item);
  }
  return KIRANA_STARTER_CATEGORIES
    .map((category) => ({ category, items: map.get(category) || [] }))
    .filter((group) => group.items.length);
}

export { KIRANA_STARTER_ITEMS };
`;

fs.writeFileSync(path.join(root, "lib", "starter-catalog-kirana.js"), file);
console.log("wrote", items.length, "items");
