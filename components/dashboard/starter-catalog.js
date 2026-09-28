"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Check, ChevronDown, ChevronLeft, Search, X } from "lucide-react";
import { useI18n } from "../i18n-provider";
import LazyImage from "../lazy-image";
import {
  KIRANA_CATEGORY_I18N,
  groupKiranaStarter,
  kiranaItemLabel,
  remainingKiranaStarter,
} from "../../lib/starter-catalog-kirana";
import "./starter-catalog.css";

const DEVANAGARI_DIGITS = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

function parseRupee(value) {
  const raw = String(value ?? "")
    .replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] || digit)
    .replace(/[₹,\s]/g, "")
    .trim();
  if (!raw) return null;
  const price = Number(raw);
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
}

function Thumb({ src, eager = false }) {
  const photo = src ? <LazyImage src={src} eager={eager} /> : null;
  if (photo) return <div className="starter-thumb">{photo}</div>;
  return (
    <div className="starter-thumb fallback" aria-hidden="true">
      <Boxes size={16} strokeWidth={2.1} />
    </div>
  );
}

export default function StarterCatalog({ existingItems, usedIds = [], onClose, onSave, saving, error }) {
  const { locale, t } = useI18n();
  const [step, setStep] = useState("pick");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [prices, setPrices] = useState({});
  const [names, setNames] = useState({});
  const [openCats, setOpenCats] = useState(() => new Set());
  const [priceError, setPriceError] = useState("");
  const [missingPriceIds, setMissingPriceIds] = useState(() => new Set());
  const priceRefs = useRef({});
  const nameRefs = useRef({});

  const remaining = useMemo(
    () => remainingKiranaStarter(existingItems, usedIds),
    [existingItems, usedIds]
  );
  const groups = useMemo(() => groupKiranaStarter(remaining, query), [remaining, query]);
  const picked = useMemo(
    () => remaining.filter((item) => selected.has(item.id)),
    [remaining, selected]
  );

  useEffect(() => {
    setSelected((prev) => {
      const keep = new Set();
      remaining.forEach((item) => {
        if (prev.has(item.id)) keep.add(item.id);
      });
      if (keep.size === prev.size && [...keep].every((id) => prev.has(id))) return prev;
      return keep;
    });
  }, [remaining]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCategory(items) {
    const ids = items.map((item) => item.id);
    const allOn = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allOn ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function toggleOpen(category) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function isOpen(category) {
    return Boolean(query.trim()) || openCats.has(category);
  }

  function labelFor(item) {
    return names[item.id] ?? kiranaItemLabel(item, locale);
  }

  function snapshotFields() {
    const nextPrices = { ...prices };
    const nextNames = { ...names };
    picked.forEach((item) => {
      const priceEl = priceRefs.current[item.id];
      const nameEl = nameRefs.current[item.id];
      if (priceEl) nextPrices[item.id] = priceEl.value;
      if (nameEl) nextNames[item.id] = nameEl.value;
    });
    setPrices(nextPrices);
    setNames(nextNames);
    return { nextPrices, nextNames };
  }

  function goPrices() {
    if (!picked.length) return;
    const nextNames = { ...names };
    picked.forEach((item) => {
      if (!nextNames[item.id]) nextNames[item.id] = kiranaItemLabel(item, locale);
    });
    setNames(nextNames);
    setPriceError("");
    setMissingPriceIds(new Set());
    setStep("price");
  }

  function onPriceKeyDown(itemId, event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const ids = picked.map((item) => item.id);
    const index = ids.indexOf(itemId);
    const next = index >= 0 ? priceRefs.current[ids[index + 1]] : null;
    if (next) next.focus();
    else event.currentTarget.blur();
  }

  function submit() {
    const missing = [];
    const rows = [];

    picked.forEach((item, index) => {
      const livePrice = priceRefs.current[item.id]?.value ?? prices[item.id];
      const liveName = nameRefs.current[item.id]?.value ?? names[item.id];
      const price = parseRupee(livePrice);
      if (price == null) {
        missing.push(item.id);
        return;
      }
      rows.push({
        starter_id: item.id,
        name: String(liveName || kiranaItemLabel(item, locale)).trim() || item.name,
        price,
        photo_url: item.image_url || null,
        category: item.category,
        in_stock: true,
        sort_order: index,
      });
    });

    if (missing.length) {
      setMissingPriceIds(new Set(missing));
      setPriceError(
        missing.length === picked.length
          ? t("menu.starterNeedPrice")
          : t("menu.starterNeedAllPrices").replace("{count}", String(missing.length))
      );
      priceRefs.current[missing[0]]?.scrollIntoView({ block: "center", behavior: "smooth" });
      priceRefs.current[missing[0]]?.focus();
      return;
    }

    setMissingPriceIds(new Set());
    setPriceError("");
    onSave(rows);
  }

  return (
    <div className="starter-overlay" role="dialog" aria-modal="true">
      <div className="starter-panel">
        <header className="starter-head">
          {step === "price" ? (
            <button
              type="button"
              className="starter-icon-btn"
              onClick={() => {
                snapshotFields();
                setStep("pick");
              }}
              aria-label={t("common.cancel")}
            >
              <ChevronLeft size={22} strokeWidth={2.2} />
            </button>
          ) : (
            <button type="button" className="starter-icon-btn" onClick={onClose} aria-label={t("common.cancel")}>
              <X size={20} strokeWidth={2.2} />
            </button>
          )}
          <div>
            <strong>{step === "pick" ? t("menu.starterTitle") : t("menu.starterPriceTitle")}</strong>
            <span>
              {step === "pick"
                ? t("menu.starterPickHint")
                : t("menu.starterPriceHint")}
            </span>
          </div>
        </header>

        {step === "pick" ? (
          <>
            <div className="starter-search">
              <Search size={16} strokeWidth={2.1} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("menu.starterSearch")}
                aria-label={t("menu.starterSearch")}
              />
            </div>
            <div className="starter-body">
              {groups.length === 0 ? (
                <p className="starter-empty">{t("menu.starterSearchEmpty")}</p>
              ) : (
                groups.map((group) => {
                  const allOn = group.items.every((item) => selected.has(item.id));
                  const open = isOpen(group.category);
                  return (
                    <section key={group.category} className="starter-section">
                      <div className="starter-section-head">
                        <button
                          type="button"
                          className="starter-section-toggle"
                          onClick={() => toggleOpen(group.category)}
                          aria-expanded={open}
                        >
                          <ChevronDown size={16} strokeWidth={2.3} className={open ? "open" : ""} />
                          <h3>{t(`menu.${KIRANA_CATEGORY_I18N[group.category]}`)}</h3>
                          <em>{group.items.length}</em>
                        </button>
                        <button type="button" onClick={() => toggleCategory(group.items)}>
                          {allOn ? t("menu.starterClear") : t("menu.starterSelectAll")}
                        </button>
                      </div>
                      {open
                        ? group.items.map((item, index) => {
                            const on = selected.has(item.id);
                            return (
                              <button
                                type="button"
                                key={item.id}
                                className={`starter-row ${on ? "on" : ""}`}
                                onClick={() => toggle(item.id)}
                              >
                                <Thumb src={item.image_url} eager={index < 4} />
                                <span className="starter-name">
                                  {kiranaItemLabel(item, locale)}
                                  {locale === "hi" && item.name !== item.name_hi ? (
                                    <em>{item.name}</em>
                                  ) : null}
                                </span>
                                <i className={`starter-tick ${on ? "on" : ""}`}>
                                  {on ? <Check size={14} strokeWidth={2.8} /> : null}
                                </i>
                              </button>
                            );
                          })
                        : null}
                    </section>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="starter-body starter-prices">
            <p className="starter-tip">{t("menu.starterRenameHint")}</p>
            {picked.map((item, index) => (
              <div
                className={`starter-price-row ${missingPriceIds.has(item.id) ? "missing" : ""}`}
                key={item.id}
              >
                <Thumb src={item.image_url} eager={index < 6} />
                <input
                  ref={(el) => {
                    if (el) nameRefs.current[item.id] = el;
                    else delete nameRefs.current[item.id];
                  }}
                  className="starter-name-input"
                  value={labelFor(item)}
                  onChange={(e) => setNames((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  aria-label={t("menu.dishName")}
                />
                <span className="starter-rupee">₹</span>
                <input
                  ref={(el) => {
                    if (el) priceRefs.current[item.id] = el;
                    else delete priceRefs.current[item.id];
                  }}
                  className="starter-price-input"
                  type="text"
                  inputMode="decimal"
                  enterKeyHint={index === picked.length - 1 ? "done" : "next"}
                  autoComplete="off"
                  placeholder={t("menu.starterPricePlaceholder")}
                  defaultValue={prices[item.id] ?? ""}
                  onChange={(e) => {
                    if (missingPriceIds.has(item.id) && parseRupee(e.target.value) != null) {
                      setMissingPriceIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                    }
                  }}
                  onKeyDown={(e) => onPriceKeyDown(item.id, e)}
                  aria-invalid={missingPriceIds.has(item.id)}
                  aria-label={t("menu.price")}
                />
              </div>
            ))}
          </div>
        )}

        {priceError || error ? (
          <p className="error-text starter-error">{priceError || error}</p>
        ) : null}

        <footer className="starter-foot">
          {step === "pick" ? (
            <>
              <button type="button" className="starter-skip" onClick={onClose}>
                {t("menu.starterSkip")}
              </button>
              <button
                type="button"
                className="primary-cta"
                disabled={!picked.length}
                onClick={goPrices}
              >
                {t("menu.starterAddItems").replace("{count}", String(picked.length))}
              </button>
            </>
          ) : (
            <button type="button" className="primary-cta" disabled={saving} onClick={submit}>
              {saving ? t("menu.starterSaving") : t("menu.starterSave")}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
