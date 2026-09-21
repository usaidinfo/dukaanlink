"use client";

import { Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { formatItemQuantity } from "../../lib/quantity-units";
import { useI18n } from "../i18n-provider";

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
        {available.map((item) => {
          const qty = cart[item.id] || 0;
          const stockLabel = formatItemQuantity(item);
          return (
            <article className="shop-item-card" key={item.id}>
              <div className="shop-item-thumb">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} loading="lazy" />
                ) : (
                  <div className="shop-item-placeholder">
                    <ShoppingBag size={26} strokeWidth={2} />
                  </div>
                )}
              </div>

              <div className="shop-item-copy">
                <h4>{item.name}</h4>
                {item.description ? <p>{item.description}</p> : null}
                <div className="shop-item-meta">
                  <strong>₹{Number(item.price)}</strong>
                  {stockLabel ? <span className="shop-stock-pill">{stockLabel}</span> : null}
                </div>
              </div>

              {qty === 0 ? (
                <button type="button" className="shop-add-btn" onClick={() => setQty(item, 1)}>
                  <Plus size={16} strokeWidth={2.4} />
                  {t("shop.add")}
                </button>
              ) : (
                <div className="shop-stepper">
                  <button type="button" onClick={() => setQty(item, qty - 1)} aria-label="Decrease quantity">
                    <Minus size={16} strokeWidth={2.4} />
                  </button>
                  <span>{qty}</span>
                  <button type="button" onClick={() => setQty(item, qty + 1)} aria-label="Increase quantity">
                    <Plus size={16} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {unavailable.map((item) => {
          const stockLabel = formatItemQuantity(item);
          return (
            <article className="shop-item-card sold-out" key={item.id}>
              <div className="shop-item-thumb gray">
                {item.photo_url ? (
                  <img src={item.photo_url} alt={item.name} loading="lazy" />
                ) : (
                  <div className="shop-item-placeholder">
                    <ShoppingBag size={26} strokeWidth={2} />
                  </div>
                )}
                <div className="shop-item-dim" />
              </div>
              <div className="shop-item-copy">
                <h4>{item.name}</h4>
                {item.description ? <p>{item.description}</p> : null}
                <div className="shop-item-meta">
                  <strong className="struck">₹{Number(item.price)}</strong>
                  {stockLabel ? <span className="shop-stock-pill muted">{stockLabel}</span> : null}
                </div>
              </div>
              <span className="shop-sold-badge">{businessCopy.availabilityOff}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
