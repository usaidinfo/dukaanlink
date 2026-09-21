"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "./i18n-provider";

export default function SeoFields({ value, onChange }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(Boolean(value?.seo_title || value?.seo_description));

  return (
    <div className="seo-panel">
      <button
        type="button"
        className={`seo-panel-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <div>
          <strong>{t("dashboard.seoToggle")}</strong>
          <span>{t("dashboard.seoHint")}</span>
        </div>
        <ChevronDown size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="seo-panel-body">
          <div className="field-row">
            <label htmlFor="seo_title">{t("dashboard.seoTitle")}</label>
            <input
              id="seo_title"
              value={value.seo_title || ""}
              onChange={(e) => onChange({ ...value, seo_title: e.target.value })}
              placeholder={t("dashboard.seoTitlePlaceholder")}
              maxLength={70}
            />
          </div>
          <div className="field-row" style={{ marginBottom: 0 }}>
            <label htmlFor="seo_description">{t("dashboard.seoDescription")}</label>
            <textarea
              id="seo_description"
              rows={3}
              value={value.seo_description || ""}
              onChange={(e) => onChange({ ...value, seo_description: e.target.value })}
              placeholder={t("dashboard.seoDescriptionPlaceholder")}
              maxLength={160}
            />
          </div>
        </div>
      )}
    </div>
  );
}
