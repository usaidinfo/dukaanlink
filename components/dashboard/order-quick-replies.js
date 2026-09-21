"use client";

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppReplyLink, isValidIndianWhatsApp, toWhatsAppDigits } from "../../lib/whatsapp";
import { getReplyTemplatesForBusiness } from "../../lib/reply-templates";
import { useI18n } from "../i18n-provider";
import { supabase } from "../../lib/supabaseClient";
import "./order-quick-replies.css";

export default function OrderQuickReplies({ order, businessCategory, onNumberSaved }) {
  const { locale, t } = useI18n();
  const templates = getReplyTemplatesForBusiness(businessCategory, locale);
  const [draftNumber, setDraftNumber] = useState(order.customer_whatsapp || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraftNumber(order.customer_whatsapp || "");
  }, [order.customer_whatsapp]);

  const hasCustomer = isValidIndianWhatsApp(order.customer_whatsapp);

  async function ensureCustomerNumber() {
    if (hasCustomer) return toWhatsAppDigits(order.customer_whatsapp);
    if (!isValidIndianWhatsApp(draftNumber)) {
      setError(t("orders.customerNumberInvalid"));
      return "";
    }
    setSaving(true);
    setError("");
    const normalized = toWhatsAppDigits(draftNumber);
    const { error: saveError } = await supabase
      .from("orders")
      .update({ customer_whatsapp: normalized })
      .eq("id", order.id);
    setSaving(false);
    if (saveError) {
      setError(
        /customer_whatsapp|column/i.test(saveError.message)
          ? t("orders.schemaMissingWhatsapp")
          : saveError.message
      );
      return "";
    }
    onNumberSaved?.(order.id, normalized);
    return normalized;
  }

  async function sendTemplate(template) {
    const number = await ensureCustomerNumber();
    if (!number) return;
    const link = buildWhatsAppReplyLink(number, template.text);
    window.open(link, "_blank");
  }

  return (
    <div className="order-replies">
      <div className="order-replies-head">
        <MessageCircle size={15} strokeWidth={2.2} />
        <span>{t("orders.quickReplies")}</span>
      </div>

      {!hasCustomer ? (
        <div className="order-replies-number">
          <p>{t("orders.needCustomerNumber")}</p>
          <div className="order-replies-number-row">
            <input
              type="tel"
              inputMode="numeric"
              value={draftNumber}
              onChange={(e) => setDraftNumber(e.target.value)}
              placeholder={t("orders.customerNumberPlaceholder")}
            />
            <button
              type="button"
              className="secondary-cta"
              disabled={saving}
              onClick={() => ensureCustomerNumber()}
            >
              {saving ? "..." : t("orders.saveNumber")}
            </button>
          </div>
          {error ? <p className="error-text" style={{ marginTop: "0.4rem" }}>{error}</p> : null}
        </div>
      ) : null}

      <div className="order-reply-chips">
        {templates.map((template) => (
          <button
            key={template.id}
            type="button"
            className="order-reply-chip"
            disabled={saving}
            onClick={() => sendTemplate(template)}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}
