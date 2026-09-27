"use client";

import { NotebookPen, Phone, User } from "lucide-react";
import { useI18n } from "../i18n-provider";
import "./shop-checkout.css";

export default function ShopCheckoutExtras({
  businessCopy,
  note,
  setNote,
  customerWhatsapp,
  setCustomerWhatsapp,
  customerName,
  setCustomerName,
  whatsappError,
  requireCustomerWhatsapp = false,
}) {
  const { t } = useI18n();

  return (
    <>
      <section className="shop-note-card">
        <label htmlFor="customer-name">
          <User size={17} strokeWidth={2.1} />
          <span>{t("shop.customerName")}</span>
          <span className="shop-field-chip optional">{t("common.optional")}</span>
        </label>
        <input
          id="customer-name"
          type="text"
          autoComplete="name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={t("shop.customerNamePlaceholder")}
          maxLength={60}
        />
        <p className="shop-field-hint">{t("shop.customerNameHint")}</p>
      </section>

      <section className={`shop-note-card ${whatsappError ? "has-error" : ""}`} id="customer-whatsapp-section">
        <label htmlFor="customer-whatsapp">
          <Phone size={17} strokeWidth={2.1} />
          <span>{t("shop.customerWhatsapp")}</span>
          <span className={`shop-field-chip ${requireCustomerWhatsapp ? "required" : "optional"}`}>
            {requireCustomerWhatsapp ? t("common.required") : t("common.optional")}
          </span>
        </label>
        <input
          id="customer-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={customerWhatsapp}
          onChange={(e) => setCustomerWhatsapp(e.target.value)}
          placeholder={t("shop.customerWhatsappPlaceholder")}
          aria-invalid={Boolean(whatsappError)}
          required={requireCustomerWhatsapp}
        />
        {whatsappError ? (
          <p className="error-text shop-field-error">{whatsappError}</p>
        ) : (
          <p className="shop-field-hint">
            {requireCustomerWhatsapp
              ? t("shop.customerWhatsappHint")
              : t("shop.customerWhatsappHintOptional")}
          </p>
        )}
      </section>

      <section className="shop-note-card">
        <label htmlFor="order-note">
          <NotebookPen size={17} strokeWidth={2.1} />
          <span>{t("shop.specialNote")}</span>
          <span className="shop-field-chip optional">{t("common.optional")}</span>
        </label>
        <input
          id="order-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={businessCopy.customerNotePlaceholder}
        />
      </section>
    </>
  );
}
