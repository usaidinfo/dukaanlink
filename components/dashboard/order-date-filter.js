"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { enIN, hi } from "date-fns/locale";
import { toDateInputValue } from "../../lib/order-range";
import { useI18n } from "../i18n-provider";
import "react-day-picker/style.css";
import "./order-date-filter.css";

const PRESETS = [
  { id: "today", labelKey: "orders.filterToday" },
  { id: "yesterday", labelKey: "orders.filterYesterday" },
  { id: "week", labelKey: "orders.filterWeek" },
  { id: "month", labelKey: "orders.filterMonth" },
  { id: "custom", labelKey: "orders.filterCustom" },
];

export function getOrderRangeLabel(preset, customDate, t, locale) {
  if (preset === "custom" && customDate) {
    try {
      const d = parseISO(`${customDate}T12:00:00`);
      return format(d, locale === "hi" ? "d MMM yyyy" : "d MMM yyyy", {
        locale: locale === "hi" ? hi : enIN,
      });
    } catch {
      return customDate;
    }
  }
  const map = {
    today: "orders.filterToday",
    yesterday: "orders.filterYesterday",
    week: "orders.filterWeek",
    month: "orders.filterMonth",
    custom: "orders.filterCustom",
  };
  return t(map[preset] || "orders.filterToday");
}

export default function OrderDateFilter({
  preset,
  customDate,
  onChange,
  triggerClassName = "",
  rangeCount,
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const label = getOrderRangeLabel(preset, customDate, t, locale);

  const selectedDay = useMemo(() => {
    if (preset !== "custom" || !customDate) return undefined;
    try {
      return startOfDay(parseISO(`${customDate}T12:00:00`));
    } catch {
      return undefined;
    }
  }, [preset, customDate]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function selectPreset(next) {
    if (next === "custom") {
      const date = customDate || toDateInputValue(new Date());
      onChange({ preset: "custom", customDate: date });
      return;
    }
    onChange({ preset: next, customDate });
    setOpen(false);
  }

  function onDaySelect(day) {
    if (!day) return;
    const value = toDateInputValue(day);
    onChange({ preset: "custom", customDate: value });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={`order-date-trigger ${triggerClassName}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays size={15} strokeWidth={2.2} />
        <span>{label}</span>
        {typeof rangeCount === "number" ? (
          <span className="order-date-trigger-count">· {rangeCount}</span>
        ) : null}
        <ChevronDown size={15} strokeWidth={2.2} />
      </button>

      {open ? (
        <div
          className="order-date-sheet-backdrop"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            className="order-date-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t("orders.filterLabel")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="order-date-sheet-head">
              <strong>{t("orders.filterLabel")}</strong>
              <button
                type="button"
                className="icon-button"
                onClick={() => setOpen(false)}
                aria-label={t("common.cancel")}
              >
                <X size={20} strokeWidth={2.1} />
              </button>
            </div>

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

            <div className="order-date-calendar">
              <p className="order-date-calendar-hint">{t("orders.pickDate")}</p>
              <DayPicker
                mode="single"
                selected={selectedDay}
                onSelect={onDaySelect}
                disabled={{ after: new Date() }}
                locale={locale === "hi" ? hi : enIN}
                defaultMonth={selectedDay || new Date()}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
