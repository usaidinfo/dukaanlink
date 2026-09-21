"use client";

import { useState } from "react";
import { ChevronDown, IndianRupee } from "lucide-react";
import { useI18n } from "../i18n-provider";
import ImageUploadField from "./image-upload-field";

const MODES = [
  { value: "both", labelKey: "dashboard.paymentModeBoth" },
  { value: "cash", labelKey: "dashboard.paymentModeCash" },
  { value: "prepaid", labelKey: "dashboard.paymentModePrepaid" },
];

export default function PaymentFields({
  value,
  onChange,
  uploading,
  onUploadQr,
}) {
  const { t } = useI18n();
  const hasPayment = Boolean(
    value?.payment_qr_url ||
      value?.upi_id ||
      (value?.payment_mode && value.payment_mode !== "both")
  );
  const [open, setOpen] = useState(hasPayment);

  return (
    <div className="seo-panel payment-panel">
      <button
        type="button"
        className={`seo-panel-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <div>
          <strong>
            <IndianRupee size={15} strokeWidth={2.3} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {t("dashboard.paymentToggle")}
          </strong>
          <span>{t("dashboard.paymentHint")}</span>
        </div>
        <ChevronDown size={18} strokeWidth={2.2} />
      </button>

      {open && (
        <div className="seo-panel-body">
          <ImageUploadField
            id="payment-qr-upload"
            label={t("dashboard.paymentQr")}
            hint={t("dashboard.paymentQrHint")}
            value={value.payment_qr_url}
            uploading={uploading}
            uploadLabel={t("dashboard.uploadPaymentQr")}
            uploadingLabel={t("dashboard.uploadingPhoto")}
            variant="cover"
            onUpload={onUploadQr}
          />

          <div className="field-row">
            <label htmlFor="upi_id">{t("dashboard.upiId")}</label>
            <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.55rem" }}>
              {t("dashboard.upiIdHint")}
            </p>
            <input
              id="upi_id"
              value={value.upi_id || ""}
              onChange={(e) => onChange({ ...value, upi_id: e.target.value })}
              placeholder={t("dashboard.upiIdPlaceholder")}
              autoComplete="off"
              inputMode="email"
            />
          </div>

          <div className="field-row" style={{ marginBottom: 0 }}>
            <label>{t("dashboard.paymentMode")}</label>
            <div className="payment-mode-options">
              {MODES.map((option) => (
                <label
                  key={option.value}
                  className={`payment-mode-option ${value.payment_mode === option.value ? "active" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment_mode"
                    value={option.value}
                    checked={value.payment_mode === option.value}
                    onChange={() => onChange({ ...value, payment_mode: option.value })}
                  />
                  <span>{t(option.labelKey)}</span>
                </label>
              ))}
            </div>
            {value.payment_mode === "prepaid" && !value.payment_qr_url && !value.upi_id ? (
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.45rem" }}>
                {t("dashboard.paymentModeNeedQr")}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
