"use client";

import BusinessCategorySelect from "../business-category-select";
import { QUANTITY_UNITS } from "../../lib/quantity-units";
import { useI18n } from "../i18n-provider";

export default function QuantityField({ quantity, unit, onChange }) {
  const { t } = useI18n();

  return (
    <div className="field-row">
      <label>{t("menu.quantityOptional")}</label>
      <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.55rem" }}>
        {t("menu.quantityHint")}
      </p>
      <div className="qty-field-row">
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => onChange({ quantity: e.target.value, unit })}
          placeholder="0"
          aria-label={t("menu.quantity")}
        />
        <div className="qty-unit-shell">
          <BusinessCategorySelect
            value={unit || "piece"}
            onChange={(nextUnit) => onChange({ quantity, unit: nextUnit })}
            options={QUANTITY_UNITS}
            ariaLabel={t("menu.unit")}
          />
        </div>
      </div>
    </div>
  );
}
