"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import en from "../locales/en";
import hi from "../locales/hi";

const messages = { en, hi };

const I18nContext = createContext(null);

function getByPath(object, path) {
  return path.split(".").reduce((value, key) => (value ? value[key] : undefined), object);
}

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("dukaanlink-locale");
    if (saved === "en" || saved === "hi") setLocale(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dukaanlink-locale", locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t(path) {
        return getByPath(messages[locale], path) ?? getByPath(messages.en, path) ?? path;
      },
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-toggle" role="group" aria-label="Language toggle">
      <button
        type="button"
        className={locale === "hi" ? "active" : ""}
        onClick={() => setLocale("hi")}
      >
        {t("common.hindi")}
      </button>
      <button
        type="button"
        className={locale === "en" ? "active" : ""}
        onClick={() => setLocale("en")}
      >
        {t("common.english")}
      </button>
    </div>
  );
}
