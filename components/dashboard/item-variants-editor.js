"use client";

import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  VARIANT_PRESETS,
  VARIANT_TYPES,
  groupVariantsByType,
  newDraftVariant,
} from "../../lib/item-variants";
import { useI18n } from "../i18n-provider";
import "./item-variants-editor.css";

const TYPE_LABELS = {
  size: "menu.variantTypeSize",
  color: "menu.variantTypeColor",
  weight: "menu.variantTypeWeight",
  pack_size: "menu.variantTypePack",
  custom: "menu.variantTypeCustom",
};

const CUSTOM_PLACEHOLDERS = {
  size: "menu.variantCustomSize",
  weight: "menu.variantCustomWeight",
  pack_size: "menu.variantCustomPack",
  custom: "menu.variantCustomLabel",
};

export default function ItemVariantsEditor({ enabled, onEnabledChange, variants, onChange }) {
  const { t } = useI18n();
  const [activeTypes, setActiveTypes] = useState(() => {
    const present = new Set((variants || []).map((row) => row.variant_type));
    return VARIANT_TYPES.filter((type) => present.has(type));
  });
  const [drafts, setDrafts] = useState({
    size: "",
    color: "",
    colorHex: "#e11d48",
    weight: "",
    pack_size: "",
    custom: "",
  });

  const grouped = groupVariantsByType(variants);

  function toggleEnabled() {
    const next = !enabled;
    onEnabledChange(next);
    if (!next) {
      onChange([]);
      setActiveTypes([]);
    }
  }

  function toggleType(type) {
    const isOn = activeTypes.includes(type);
    if (isOn) {
      setActiveTypes((prev) => prev.filter((id) => id !== type));
      onChange((variants || []).filter((row) => row.variant_type !== type));
      return;
    }
    setActiveTypes((prev) => [...prev, type]);
  }

  function addVariant(type, label, colorHex = null) {
    const value = String(label || "").trim();
    if (!value) return;
    const exists = (variants || []).some(
      (row) => row.variant_type === type && row.label.toLowerCase() === value.toLowerCase()
    );
    if (exists) return;
    onChange([...(variants || []), newDraftVariant(type, value, colorHex)]);
  }

  function updateVariant(id, patch) {
    onChange((variants || []).map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeVariant(id) {
    onChange((variants || []).filter((row) => row.id !== id));
  }

  function submitCustom(type) {
    if (type === "color") {
      addVariant("color", drafts.color, drafts.colorHex);
      setDrafts((prev) => ({ ...prev, color: "" }));
      return;
    }
    addVariant(type, drafts[type]);
    setDrafts((prev) => ({ ...prev, [type]: "" }));
  }

  return (
    <div className="variants-card">
      <div className="variants-card-head">
        <div>
          <strong>{t("menu.variantsTitle")}</strong>
          <p>{t("menu.variantsHint")}</p>
        </div>
        <button
          type="button"
          className={`availability-toggle ${enabled ? "on" : ""}`}
          onClick={toggleEnabled}
          aria-pressed={enabled}
          aria-label={t("menu.variantsToggle")}
        >
          <span>{enabled ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}</span>
        </button>
      </div>
      {/* <p className="variants-toggle-label">{t("menu.variantsToggle")}</p> */}

      {enabled ? (
        <>
          <div className="variant-type-chips">
            {VARIANT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className={`variant-type-chip ${activeTypes.includes(type) ? "active" : ""}`}
                onClick={() => toggleType(type)}
              >
                {t(TYPE_LABELS[type])}
              </button>
            ))}
          </div>

          {activeTypes.map((type) => (
            <div className="variant-type-panel" key={type}>
              <div className="variant-type-panel-title">{t(TYPE_LABELS[type])}</div>

              {VARIANT_PRESETS[type] ? (
                <div className="variant-quick-chips">
                  {VARIANT_PRESETS[type].map((label) => {
                    const added = grouped[type].some((row) => row.label === label);
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`variant-quick-chip ${added ? "added" : ""}`}
                        disabled={added}
                        onClick={() => addVariant(type, label)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {type === "color" ? (
                <div className="variant-add-row">
                  <input
                    type="color"
                    className="variant-color-picker"
                    value={drafts.colorHex}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, colorHex: e.target.value }))}
                    aria-label={t("menu.variantColorSwatch")}
                  />
                  <input
                    value={drafts.color}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder={t("menu.variantColorName")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitCustom("color");
                      }
                    }}
                  />
                  <button type="button" className="variant-add-btn" onClick={() => submitCustom("color")}>
                    <Plus size={16} strokeWidth={2.2} />
                    {t("menu.variantAdd")}
                  </button>
                </div>
              ) : (
                <div className="variant-add-row">
                  <input
                    value={drafts[type]}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [type]: e.target.value }))}
                    placeholder={t(CUSTOM_PLACEHOLDERS[type])}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        submitCustom(type);
                      }
                    }}
                  />
                  <button type="button" className="variant-add-btn" onClick={() => submitCustom(type)}>
                    <Plus size={16} strokeWidth={2.2} />
                    {t("menu.variantAdd")}
                  </button>
                </div>
              )}

              {grouped[type].map((row) => (
                <div className="variant-value-row" key={row.id}>
                  <div className="variant-value-label">
                    {row.variant_type === "color" && row.color_hex ? (
                      <i className="variant-swatch" style={{ background: row.color_hex }} />
                    ) : null}
                    <span>{row.label}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={row.price}
                    onChange={(e) => updateVariant(row.id, { price: e.target.value })}
                    placeholder={t("menu.variantPrice")}
                    required
                  />
                  <button
                    type="button"
                    className={`availability-toggle compact ${row.in_stock ? "on" : ""}`}
                    onClick={() => updateVariant(row.id, { in_stock: !row.in_stock })}
                    aria-label={t("menu.available")}
                  >
                    <span>
                      {row.in_stock ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="variant-remove-btn"
                    onClick={() => removeVariant(row.id)}
                    aria-label={t("menu.delete")}
                  >
                    <Trash2 size={16} strokeWidth={2.1} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
