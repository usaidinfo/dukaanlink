"use client";

import { ChevronRight, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatItemQuantity } from "../../lib/quantity-units";
import {
  VARIANT_TYPES,
  cartLineKey,
  defaultInStockVariant,
  groupVariantsByType,
  itemHasVariants,
  sortVariants,
} from "../../lib/item-variants";
import { normalizeGst } from "../../lib/gst";
import { isStockTracking } from "../../lib/stock-alerts";
import { useI18n } from "../i18n-provider";
import "./shop-catalog.css";

function ShopPrice({ item, price, soldOut = false, packLabel = "" }) {
  const { t } = useI18n();
  const gst = normalizeGst(item);
  return (
    <div className="shop-item-price">
      {gst.gst_mode === "excluded" && gst.gst_rate != null ? (
        <span className="shop-gst-extra">{t("shop.gstExclNote").replace("{rate}", String(gst.gst_rate))}</span>
      ) : null}
      <div className="shop-price-row">
        <strong className={soldOut ? "struck" : ""}>₹{price}</strong>
        {packLabel ? (
          <span className="shop-price-pack">{t("shop.priceForPack").replace("{pack}", packLabel)}</span>
        ) : null}
      </div>
      {gst.gst_mode === "included" && gst.gst_rate != null ? (
        <span className="shop-gst-note">{t("shop.gstInclNote").replace("{rate}", String(gst.gst_rate))}</span>
      ) : null}
    </div>
  );
}

function ShopStock({ item, soldOut = false }) {
  const { t } = useI18n();
  if (!isStockTracking(item)) return null;
  const qty = formatItemQuantity(item);
  if (!qty) return null;
  return (
    <div className={`shop-stock-line ${soldOut ? "muted" : ""}`}>
      {t("shop.availableStock").replace("{qty}", qty)}
    </div>
  );
}

const TYPE_LABELS = {
  size: "menu.variantTypeSize",
  color: "menu.variantTypeColor",
  weight: "menu.variantTypeWeight",
  pack_size: "menu.variantTypePack",
  custom: "menu.variantTypeCustom",
};

function VariantPill({ variant, selected, onSelect, locked = false }) {
  const soldOut = locked || !variant.in_stock;
  const isOn = !locked && selected?.id === variant.id;
  return (
    <button
      type="button"
      className={`shop-variant-pill ${isOn ? "selected" : ""} ${soldOut ? "sold-out" : ""}`}
      disabled={soldOut}
      onClick={() => !soldOut && onSelect(variant)}
    >
      {variant.variant_type === "color" && variant.color_hex ? (
        <i className="shop-variant-swatch" style={{ background: variant.color_hex }} />
      ) : null}
      <span>{variant.label}</span>
      <em>₹{Number(variant.price)}</em>
    </button>
  );
}

function VariantGroups({ item, selected, onSelect, t, locked = false }) {
  const groups = groupVariantsByType(item.item_variants);
  const activeTypes = VARIANT_TYPES.filter((type) => groups[type].length > 0);

  return (
    <div className="shop-variant-groups">
      {activeTypes.map((type) => (
        <div className="shop-variant-row" key={type}>
          <span className="shop-variant-type">{t(TYPE_LABELS[type])}</span>
          <div className="shop-variant-pills">
            {groups[type].map((variant) => (
              <VariantPill
                key={variant.id}
                variant={variant}
                selected={selected}
                onSelect={onSelect}
                locked={locked}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddOrStepper({ item, variant, qty, setQty, t }) {
  if (qty === 0) {
    return (
      <button type="button" className="shop-add-btn" onClick={() => setQty(item, 1, variant)}>
        <Plus size={16} strokeWidth={2.4} />
        {t("shop.add")}
      </button>
    );
  }

  return (
    <div className="shop-stepper">
      <button
        type="button"
        onClick={() => setQty(item, qty - 1, variant)}
        aria-label="Decrease quantity"
      >
        <Minus size={16} strokeWidth={2.4} />
      </button>
      <span>{qty}</span>
      <button
        type="button"
        onClick={() => setQty(item, qty + 1, variant)}
        aria-label="Increase quantity"
      >
        <Plus size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function ShopItemCard({ item, businessCopy, cart, setQty, soldOut, onOpenOptions }) {
  const { t } = useI18n();
  const variants = useMemo(() => sortVariants(item.item_variants), [item.item_variants]);
  const hasVariants = itemHasVariants(item);
  const selected = defaultInStockVariant(variants);
  const qty = cart[cartLineKey(item.id, hasVariants ? selected?.id : null)] || 0;
  const price = hasVariants && selected ? Number(selected.price) : Number(item.price);
  const packLabel = hasVariants ? selected?.label || "" : "";
  const optionCount = variants.length;

  return (
    <article className={`shop-item-card ${soldOut ? "sold-out" : ""}`}>
      <div className={`shop-item-thumb ${soldOut ? "gray" : ""}`}>
        {item.photo_url ? (
          <img src={item.photo_url} alt={item.name} loading="lazy" />
        ) : (
          <div className="shop-item-placeholder">
            <ShoppingBag size={26} strokeWidth={2} />
          </div>
        )}
        {soldOut ? <div className="shop-item-dim" /> : null}
      </div>

      <div className="shop-item-copy">
        <h4>{item.name}</h4>
        {item.description ? <p>{item.description}</p> : null}
        {hasVariants ? (
          soldOut ? (
            <p className="shop-variant-summary">
              {t("shop.optionCount").replace("{count}", String(optionCount))}
            </p>
          ) : (
            <button type="button" className="shop-option-link" onClick={() => onOpenOptions(item)}>
              <span>{selected?.label || t("shop.chooseOption")}</span>
              <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          )
        ) : null}
        <div className="shop-item-meta">
          <ShopPrice item={item} price={price} soldOut={soldOut} packLabel={packLabel} />
        </div>
        <ShopStock item={item} soldOut={soldOut} />
      </div>

      {soldOut ? (
        <span className="shop-sold-badge">{businessCopy.availabilityOff}</span>
      ) : hasVariants ? (
        <button type="button" className="shop-add-btn" onClick={() => onOpenOptions(item)}>
          <Plus size={16} strokeWidth={2.4} />
          {t("shop.add")}
        </button>
      ) : (
        <AddOrStepper item={item} variant={null} qty={qty} setQty={setQty} t={t} />
      )}
    </article>
  );
}

function VariantSheet({ item, cart, setQty, onClose }) {
  const { t } = useI18n();
  const variants = useMemo(() => sortVariants(item.item_variants), [item.item_variants]);
  const [selectedId, setSelectedId] = useState(() => defaultInStockVariant(variants)?.id || null);
  const selected = variants.find((row) => row.id === selectedId) || defaultInStockVariant(variants);
  const qty = cart[cartLineKey(item.id, selected?.id)] || 0;
  const price = selected ? Number(selected.price) : Number(item.price);
  const packLabel = selected?.label || "";

  return (
    <div className="sheet-backdrop shop-variant-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet shop-variant-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-variant-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="shop-variant-sheet-head">
          <div className="shop-item-thumb">
            {item.photo_url ? (
              <img src={item.photo_url} alt="" />
            ) : (
              <div className="shop-item-placeholder">
                <ShoppingBag size={26} strokeWidth={2} />
              </div>
            )}
          </div>
          <div className="shop-item-copy">
            <h4 id="shop-variant-title">{item.name}</h4>
            {item.description ? <p>{item.description}</p> : null}
            <div className="shop-item-meta">
              <ShopPrice item={item} price={price} packLabel={packLabel} />
            </div>
            <ShopStock item={item} />
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.cancel")}>
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>

        <VariantGroups
          item={item}
          selected={selected}
          onSelect={(variant) => setSelectedId(variant.id)}
          t={t}
        />

        <div className="shop-variant-sheet-foot">
          <div>
            <div className="eyebrow">{selected?.label || t("shop.chooseOption")}</div>
            <ShopPrice item={item} price={price} packLabel={packLabel} />
          </div>
          <AddOrStepper
            item={item}
            variant={selected}
            qty={qty}
            setQty={setQty}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

export default function ShopCatalog({
  businessCopy,
  items,
  filteredItems,
  available,
  unavailable,
  search,
  setSearch,
  cart,
  setQty,
}) {
  const { t } = useI18n();
  const [optionsItem, setOptionsItem] = useState(null);

  return (
    <section className="shop-catalog">
      <div className="shop-catalog-head">
        <div className="shop-catalog-title">
          <h3>{businessCopy.collectionHeader}</h3>
          <span className="shop-count-pill">{filteredItems.length}</span>
        </div>
      </div>

      {items.length > 0 && (
        <div className="shop-search">
          <Search size={18} strokeWidth={2.1} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("shop.searchPlaceholder")}
            aria-label={t("shop.searchPlaceholder")}
          />
          {search ? (
            <button
              type="button"
              className="shop-search-clear"
              onClick={() => setSearch("")}
              aria-label={t("common.cancel")}
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      )}

      {items.length === 0 && <p className="empty-state">{businessCopy.customerEmpty}</p>}
      {items.length > 0 && filteredItems.length === 0 && (
        <p className="empty-state">{t("shop.searchEmpty")}</p>
      )}

      <div className="shop-item-list">
        {available.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            businessCopy={businessCopy}
            cart={cart}
            setQty={setQty}
            onOpenOptions={setOptionsItem}
          />
        ))}

        {unavailable.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            businessCopy={businessCopy}
            cart={cart}
            setQty={setQty}
            soldOut
            onOpenOptions={setOptionsItem}
          />
        ))}
      </div>

      {optionsItem ? (
        <VariantSheet
          item={optionsItem}
          cart={cart}
          setQty={setQty}
          onClose={() => setOptionsItem(null)}
        />
      ) : null}
    </section>
  );
}
