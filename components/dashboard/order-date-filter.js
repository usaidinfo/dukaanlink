"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toDateInputValue } from "../../lib/order-range";
import { useI18n } from "../i18n-provider";
import "./order-date-filter.css";

const PRESETS = [
  { id: "today", labelKey: "orders.filterToday" },
  { id: "yesterday", labelKey: "orders.filterYesterday" },
  { id: "week", labelKey: "orders.filterWeek" },
  { id: "month", labelKey: "orders.filterMonth" },
  { id: "custom", labelKey: "orders.filterCustom" },
];

export default function OrderDateFilter({ preset, customDate, onChange }) {
  const { t } = useI18n();
  const [pickerOpen, setPickerOpen] = useState(preset === "custom");
  const inputRef = useRef(null);

  useEffect(() => {
    if (preset === "custom") setPickerOpen(true);
  }, [preset]);

  useEffect(() => {
    if (pickerOpen && preset === "custom") {
      window.setTimeout(() => inputRef.current?.showPicker?.(), 50);
    }
  }, [pickerOpen, preset]);

  function selectPreset(next) {
    if (next === "custom") {
      const date = customDate || toDateInputValue(new Date());
      setPickerOpen(true);
      onChange({ preset: "custom", customDate: date });
      return;
    }
    setPickerOpen(false);
    onChange({ preset: next, customDate });
  }

  return (
    <div className="order-date-filter">
      <div className="order-date-chips" role="tablist" aria-label={t("orders.filterLabel")}>
        {PRESETS.map((item) => {
          const active = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`order-date-chip ${active ? "active" : ""}`}
              onClick={() => selectPreset(item.id)}
            >
              {item.id === "custom" ? <CalendarDays size={14} strokeWidth={2.2} /> : null}
              {t(item.labelKey)}
            </button>
          );
        })}
      </div>

      {preset === "custom" && pickerOpen ? (
        <div className="order-date-picker">
          <label htmlFor="orders-custom-date">{t("orders.pickDate")}</label>
          <input
            ref={inputRef}
            id="orders-custom-date"
            type="date"
            value={customDate || toDateInputValue(new Date())}
            max={toDateInputValue(new Date())}
            onChange={(e) => onChange({ preset: "custom", customDate: e.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
