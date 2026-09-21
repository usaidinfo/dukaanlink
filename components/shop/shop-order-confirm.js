"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Download, ExternalLink, QrCode, X } from "lucide-react";
import { useI18n } from "../i18n-provider";
import { buildUpiPayLink, downloadImage, isValidUpiId } from "../../lib/upi";

export default function ShopOrderConfirm({
  open,
  onClose,
  mode,
  paymentQrUrl,
  upiId,
  businessName,
  total,
  cartCount,
  ordering,
  onConfirm,
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const upiLink = useMemo(
    () =>
      buildUpiPayLink({
        upiId,
        payeeName: businessName,
        amount: total,
        note: businessName ? `Order ${businessName}` : "DukaanLink order",
      }),
    [upiId, businessName, total]
  );
  const canOpenUpi = Boolean(upiLink && isValidUpiId(upiId));

  useEffect(() => {
    if (!open) return;
    setChoice(mode === "prepaid" ? true : null);
  }, [open, mode]);

  if (!open) return null;

  const payEarly = mode === "prepaid" ? true : choice === true;
  const showPayPanel =
    (Boolean(paymentQrUrl) || canOpenUpi) && (mode === "prepaid" || choice === true);
  const ready = mode === "prepaid" || choice !== null;

  async function handleDownload() {
    if (!paymentQrUrl || downloading) return;
    setDownloading(true);
    try {
      await downloadImage(paymentQrUrl, "payment-qr.png");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="sheet-backdrop shop-order-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet shop-order-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-order-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="shop-order-head">
          <div>
            <h2 id="shop-order-title">
              {mode === "prepaid" ? t("shop.paySheetPrepaidTitle") : t("shop.paySheetTitle")}
            </h2>
            <p className="muted">
              {cartCount} {cartCount === 1 ? t("shop.item") : t("shop.items")} • ₹{total}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("common.cancel")}>
            <X size={22} strokeWidth={2.1} />
          </button>
        </div>

        {mode === "prepaid" ? (
          <p className="shop-order-lead">{t("shop.paySheetPrepaidText")}</p>
        ) : (
          <>
            <p className="shop-order-lead">{t("shop.paySheetAsk")}</p>
            <div className="shop-order-choices">
              <button
                type="button"
                className={`shop-order-choice ${choice === true ? "active" : ""}`}
                onClick={() => setChoice(true)}
              >
                <QrCode size={18} strokeWidth={2.2} />
                <span>{t("shop.paySheetPayNow")}</span>
              </button>
              <button
                type="button"
                className={`shop-order-choice ${choice === false ? "active" : ""}`}
                onClick={() => setChoice(false)}
              >
                <Banknote size={18} strokeWidth={2.2} />
                <span>{t("shop.paySheetPayLater")}</span>
              </button>
            </div>
          </>
        )}

        {showPayPanel && (
          <div className="shop-pay-panel shop-order-qr">
            <div className="shop-pay-title">
              <QrCode size={18} strokeWidth={2.2} />
              <strong>{t("shop.payEarlyTitle")}</strong>
            </div>

            {paymentQrUrl ? (
              <div className="shop-pay-qr">
                <img src={paymentQrUrl} alt="Payment QR" />
              </div>
            ) : null}

            <div className="shop-pay-actions">
              {paymentQrUrl ? (
                <button
                  type="button"
                  className="secondary-cta shop-pay-action"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download size={17} strokeWidth={2.2} />
                  {downloading ? t("shop.payQrDownloading") : t("shop.payQrDownload")}
                </button>
              ) : null}

              {canOpenUpi ? (
                <a className="secondary-cta shop-pay-action" href={upiLink}>
                  <ExternalLink size={17} strokeWidth={2.2} />
                  {t("shop.payOpenUpi")}
                </a>
              ) : null}
            </div>

            <p className="shop-pay-steps">{t("shop.paySheetSteps")}</p>
            {canOpenUpi ? <p className="shop-pay-upi-hint">{t("shop.payOpenUpiHint")}</p> : null}
          </div>
        )}

        {choice === false && (
          <p className="shop-order-later">{t("shop.paySheetLaterNote")}</p>
        )}

        <button
          type="button"
          className="primary-cta shop-order-confirm"
          disabled={!ready || ordering}
          onClick={() => onConfirm(payEarly)}
        >
          {ordering
            ? "Opening..."
            : payEarly
              ? t("shop.paySheetPaid")
              : t("shop.paySheetContinue")}
        </button>
      </div>
    </div>
  );
}
