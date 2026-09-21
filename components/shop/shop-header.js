"use client";

import { ArrowLeft } from "lucide-react";
import { LanguageToggle, useI18n } from "../i18n-provider";
import "./shop-header.css";

export default function ShopHeader({ businessName, openStatus, onBack }) {
  const { t } = useI18n();
  const showPill = Boolean(openStatus?.known);
  const isOpen = Boolean(openStatus?.isOpen);

  return (
    <header className="shop-topbar">
      <div className="shop-topbar-left">
        <button type="button" className="shop-back-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="shop-topbar-copy">
          <span>{t("shop.storeLabel")}</span>
          <h1>{businessName}</h1>
        </div>
      </div>
      <div className="shop-topbar-right">
        {showPill ? (
          <div className={`shop-open-pill ${isOpen ? "" : "closed"}`}>
            <span className="shop-open-dot">
              {isOpen ? <i className="shop-open-pulse" /> : null}
            </span>
            {isOpen
              ? openStatus.label || t("shop.openNow")
              : openStatus.label || t("shop.closedNow")}
          </div>
        ) : null}
        <LanguageToggle />
      </div>
    </header>
  );
}
