"use client";

import { GST_RATES } from "../../lib/gst";
import { useI18n } from "../i18n-provider";
import "./gst-options-field.css";

const MODES = [
  { value: "included", labelKey: "menu.gstIncluded" },
  { value: "excluded", labelKey: "menu.gstExcluded" },
  { value: "no_gst", labelKey: "menu.gstNone" },
];

export default function GstOptionsField({ gstMode, gstRate, onChange }) {
  const { t } = useI18n();
  const mode = gstMode || "no_gst";
  const showRate = mode === "included" || mode === "excluded";
  const rate = gstRate === "" || gstRate == null ? 18 : Number(gstRate);

  return (
    <div className="gst-options">
      <label>{t("menu.gstOptions")}</label>
      <div className="gst-option-list" role="radiogroup" aria-label={t("menu.gstOptions")}>
        {MODES.map((option) => {
          const selected = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`gst-option ${selected ? "selected" : ""}`}
              onClick={() =>
                onChange({
                  gst_mode: option.value,
                  gst_rate: option.value === "no_gst" ? "" : String(Number.isFinite(rate) ? rate : 18),
                })
              }
            >
              <i className="gst-radio" aria-hidden="true" />
              <span>{t(option.labelKey)}</span>
            </button>
          );
        })}
      </div>
      {showRate ? (
        <div className="gst-rate-row">
          <label htmlFor="gst-rate">{t("menu.gstRate")}</label>
          <select
            id="gst-rate"
            value={Number.isFinite(rate) ? rate : 18}
            onChange={(e) => onChange({ gst_mode: mode, gst_rate: e.target.value })}
          >
            {GST_RATES.map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
