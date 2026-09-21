"use client";

import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { useI18n } from "./i18n-provider";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function emptyOpeningHours() {
  return null;
}

export function defaultDays() {
  return Object.fromEntries(
    DAY_KEYS.map((day) => [day, { closed: false, open: "10:00", close: "22:00" }])
  );
}

export function normalizeOpeningHours(value) {
  const days = defaultDays();
  if (!value || typeof value !== "object") {
    return { configured: false, days };
  }

  const source = value.days && typeof value.days === "object" ? value.days : value;
  for (const day of DAY_KEYS) {
    const row = source[day];
    if (!row || typeof row !== "object") continue;
    days[day] = {
      closed: Boolean(row.closed),
      open: row.open || "10:00",
      close: row.close || "22:00",
    };
  }

  const configured =
    value.configured === true ||
    (value.configured !== false &&
      DAY_KEYS.some((day) => source[day] && (source[day].open || source[day].close || source[day].closed)));

  return { configured, days };
}

/** Only true when owner has actually saved opening hours. */
export function hasAnyOpeningHours(value) {
  if (!value || typeof value !== "object") return false;
  if (value.configured === true) return true;
  if (value.configured === false) return false;
  // legacy rows saved as plain day map
  return DAY_KEYS.some((day) => {
    const row = value[day] || value.days?.[day];
    return row && typeof row === "object" && (row.open || row.close || row.closed);
  });
}

function parseHm(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function getIndiaClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value || "";
  let hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (hour === 24) hour = 0;

  const dayKey = {
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
    Sun: "sun",
  }[weekday];

  return {
    dayKey,
    minutes: hour * 60 + minute,
  };
}

/** YYYY-MM-DD in Asia/Kolkata (no cron needed for closed-today). */
export function getIndiaDateString(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function normalizeDateOnly(value) {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

/**
 * Honest open/closed from configured hours (India timezone).
 * closedTodayDate wins when it equals today's India date.
 * Returns { known: false } when owner never set hours (and not closed today).
 */
export function getShopOpenStatus(openingHours, now = new Date(), closedTodayDate = null) {
  const today = getIndiaDateString(now);
  const closedDate = normalizeDateOnly(closedTodayDate);
  if (closedDate && closedDate === today) {
    return { known: true, isOpen: false, closedToday: true };
  }

  if (!hasAnyOpeningHours(openingHours)) {
    return { known: false, isOpen: false, closedToday: false };
  }

  const { days } = normalizeOpeningHours(openingHours);
  const { dayKey, minutes } = getIndiaClock(now);
  if (!dayKey || !days[dayKey]) {
    return { known: false, isOpen: false, closedToday: false };
  }

  const row = days[dayKey];
  if (row.closed) {
    return { known: true, isOpen: false, closedToday: false };
  }

  const openAt = parseHm(row.open);
  const closeAt = parseHm(row.close);
  if (openAt == null || closeAt == null) {
    return { known: false, isOpen: false, closedToday: false };
  }

  // Same open/close → treat as 24 hours that day
  if (openAt === closeAt) {
    return { known: true, isOpen: true, closedToday: false };
  }

  // Overnight window e.g. 22:00 – 02:00
  if (closeAt < openAt) {
    return {
      known: true,
      isOpen: minutes >= openAt || minutes < closeAt,
      closedToday: false,
    };
  }

  return {
    known: true,
    isOpen: minutes >= openAt && minutes < closeAt,
    closedToday: false,
  };
}

export function isClosedTodayFlag(closedTodayDate, now = new Date()) {
  const closedDate = normalizeDateOnly(closedTodayDate);
  return Boolean(closedDate && closedDate === getIndiaDateString(now));
}

export function OpeningHoursFields({ value, onChange }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(Boolean(value && hasAnyOpeningHours(value)));
  const [applyPrompt, setApplyPrompt] = useState(null);
  const normalized = normalizeOpeningHours(value);
  const hours = normalized.days;

  function commit(nextDays, configured = true) {
    onChange({ configured, days: nextDays });
  }

  function updateDay(day, patch, fromTimeChange = false) {
    const nextDays = {
      ...hours,
      [day]: { ...hours[day], ...patch },
    };
    commit(nextDays, true);

    if (fromTimeChange && !nextDays[day].closed) {
      setApplyPrompt({
        day,
        open: nextDays[day].open,
        close: nextDays[day].close,
      });
    }
  }

  function applyToAll() {
    if (!applyPrompt) return;
    const nextDays = Object.fromEntries(
      DAY_KEYS.map((day) => [
        day,
        {
          ...hours[day],
          closed: false,
          open: applyPrompt.open,
          close: applyPrompt.close,
        },
      ])
    );
    commit(nextDays, true);
    setApplyPrompt(null);
  }

  return (
    <div className="hours-editor">
      <button type="button" className="hours-editor-toggle" onClick={() => setOpen((v) => !v)}>
        <span>
          <Clock size={16} strokeWidth={2.2} />
          {t("dashboard.hoursToggle")}
        </span>
        <ChevronDown size={18} strokeWidth={2.2} className={open ? "open" : ""} />
      </button>
      {open && (
        <div className="hours-editor-body">
          <p className="muted hours-hint">{t("dashboard.hoursHint")}</p>

          {applyPrompt && (
            <div className="hours-apply-banner">
              <p>
                {t("dashboard.applyHoursAsk").replace(
                  "{day}",
                  t(`dashboard.day.${applyPrompt.day}`)
                )}
              </p>
              <div className="hours-apply-actions">
                <button type="button" className="hours-apply-yes" onClick={applyToAll}>
                  {t("dashboard.applyHoursYes")}
                </button>
                <button type="button" className="hours-apply-no" onClick={() => setApplyPrompt(null)}>
                  {t("dashboard.applyHoursNo")}
                </button>
              </div>
            </div>
          )}

          {DAY_KEYS.map((day) => {
            const row = hours[day];
            return (
              <div className="hours-row" key={day}>
                <span className="hours-day">{t(`dashboard.day.${day}`)}</span>
                <label className="hours-closed">
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={(e) => updateDay(day, { closed: e.target.checked })}
                  />
                  {t("dashboard.closed")}
                </label>
                <input
                  type="time"
                  value={row.open}
                  disabled={row.closed}
                  onChange={(e) => updateDay(day, { open: e.target.value }, true)}
                  aria-label={`${day} open`}
                />
                <span className="hours-sep">–</span>
                <input
                  type="time"
                  value={row.close}
                  disabled={row.closed}
                  onChange={(e) => updateDay(day, { close: e.target.value }, true)}
                  aria-label={`${day} close`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
