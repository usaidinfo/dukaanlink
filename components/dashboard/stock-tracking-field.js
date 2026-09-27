"use client";

import { Check, X } from "lucide-react";
import BusinessCategorySelect from "../business-category-select";
import { QUANTITY_UNITS } from "../../lib/quantity-units";
import { useI18n } from "../i18n-provider";
import "./stock-tracking-field.css";

export default function StockTrackingField({
  enabled,
  quantity,
  unit,
  alertBelow,
  onChange,
}) {
  const { t } = useI18n();

  function toggle() {
    const next = !enabled;
    onChange({
      stock_tracking_enabled: next,
      quantity: next ? quantity || "0" : quantity,
      quantity_unit: unit || "piece",
      alert_below: next ? alertBelow || "5" : alertBelow,
    });
  }

  return (
    <div className="stock-track-card">
      <div className="stock-track-head">
        <div>
          <strong>{t("menu.trackStockQuestion")}</strong>
          {!enabled ? <p>{t("menu.trackStockOffHint")}</p> : null}
        </div>
        <button
          type="button"
          className={`availability-toggle ${enabled ? "on" : ""}`}
          onClick={toggle}
          aria-pressed={enabled}
          aria-label={t("menu.trackStockQuestion")}
        >
          <span>{enabled ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}</span>
        </button>
      </div>

      {enabled ? (
        <>
          <div className="stock-track-grid">
            <div>
              <label htmlFor="current-stock">{t("menu.currentStock")}</label>
              <input
                id="current-stock"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={quantity}
                onChange={(e) =>
                  onChange({
                    stock_tracking_enabled: true,
                    quantity: e.target.value,
                    quantity_unit: unit,
                    alert_below: alertBelow,
                  })
                }
              />
              <div className="qty-unit-shell" style={{ marginTop: "0.4rem" }}>
                <BusinessCategorySelect
                  value={unit || "piece"}
                  onChange={(nextUnit) =>
                    onChange({
                      stock_tracking_enabled: true,
                      quantity,
                      quantity_unit: nextUnit,
                      alert_below: alertBelow,
                    })
                  }
                  options={QUANTITY_UNITS}
                  ariaLabel={t("menu.unit")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="alert-below">{t("menu.alertBelow")}</label>
              <input
                id="alert-below"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={alertBelow}
                onChange={(e) =>
                  onChange({
                    stock_tracking_enabled: true,
                    quantity,
                    quantity_unit: unit,
                    alert_below: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <p className="stock-track-hint">{t("menu.alertBelowHint")}</p>
        </>
      ) : null}
    </div>
  );
}
