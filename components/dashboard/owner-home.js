"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  Copy,
  Download,
  Link2,
  Pencil,
  Printer,
  ReceiptText,
  Share2,
  Store,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { getBusinessCopy, getBusinessMode } from "../../lib/business-config";
import {
  buildQrCardCanvas,
  canvasToBlob,
  downloadBlob,
} from "../../lib/qr-card";
import { isClosedTodayFlag } from "../opening-hours-fields";
import { useI18n } from "../i18n-provider";
import BusinessProfileForm from "./business-profile-form";
import "./owner-home.css";

export default function OwnerHome({
  business,
  form,
  setForm,
  newOrders,
  siteUrl,
  editOpen,
  setEditOpen,
  onUpdate,
  onToggleClosedToday,
  closedTodaySaving,
  saving,
  error,
  uploadingLogo,
  uploadingCover,
  uploadingPaymentQr,
  onUploadImage,
}) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const qrRef = useRef(null);
  const businessCopy = getBusinessCopy(business.category, locale);
  const CollectionIcon = getBusinessMode(business.category) === "food" ? UtensilsCrossed : Boxes;
  const shopLink = `${siteUrl}/shop/${business.slug}`;
  const shortLink = shopLink.replace(/^https?:\/\//, "");
  const closedToday = isClosedTodayFlag(business.closed_today_date);
  const cardHeading = String(t("dashboard.qrCardScan")).replace(
    "{type}",
    businessCopy.collectionName || "Catalog"
  );
  const fileBase = business.slug || "dukaanlink";

  async function copyLink() {
    await navigator.clipboard.writeText(shopLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  async function getQrCardBlob() {
    const qrCanvas = qrRef.current?.querySelector("canvas");
    if (!qrCanvas) return null;
    const card = buildQrCardCanvas({
      qrCanvas,
      businessName: business.name,
      heading: cardHeading,
      poweredBy: t("dashboard.qrCardPowered"),
    });
    if (!card) return null;
    return canvasToBlob(card);
  }

  async function downloadQr() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await getQrCardBlob();
      if (!blob) return;
      downloadBlob(blob, `${fileBase}-qr-card.png`);
    } finally {
      setBusy(false);
    }
  }

  async function shareQr() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await getQrCardBlob();
      if (!blob) return;
      const file = new File([blob], `${fileBase}-qr-card.png`, { type: "image/png" });
      const shareData = {
        title: business.name,
        text: `${business.name} — ${cardHeading}\n${shopLink}`,
        files: [file],
      };

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: business.name,
          text: `${business.name} — ${cardHeading}\n${shopLink}`,
          url: shopLink,
        });
        return;
      }

      downloadBlob(blob, `${fileBase}-qr-card.png`);
    } catch (err) {
      if (err?.name !== "AbortError") {
        const blob = await getQrCardBlob();
        if (blob) downloadBlob(blob, `${fileBase}-qr-card.png`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page owner-home">
      <div className="dashboard-center">
        <div className={`status-chip ${closedToday ? "closed-today" : "live"}`}>
          <span className="pulse" />
          <span>{closedToday ? t("dashboard.closedTodayChip") : t("dashboard.live")}</span>
        </div>
        <div className="dashboard-title-row">
          <h2>{business.name}</h2>
          <button
            type="button"
            className="icon-button edit-chip-btn"
            onClick={() => setEditOpen(true)}
            aria-label={t("dashboard.editProfile")}
          >
            <Pencil size={16} strokeWidth={2.2} />
          </button>
        </div>
        <p>{businessCopy.heroSubline || t("dashboard.yourStore")}</p>
      </div>

      <button
        type="button"
        className={`closed-today-toggle ${closedToday ? "on" : ""}`}
        onClick={() => onToggleClosedToday?.(!closedToday)}
        disabled={closedTodaySaving}
        aria-pressed={closedToday}
      >
        <div className="closed-today-copy">
          <strong>{t("dashboard.closedToday")}</strong>
          <span>
            {closedToday ? t("dashboard.closedTodayOnHint") : t("dashboard.closedTodayOffHint")}
          </span>
        </div>
        <span className="closed-today-switch" aria-hidden="true">
          <i />
        </span>
      </button>

      <section className="qr-standee">
        <div className="qr-standee-ribbon" aria-hidden="true" />
        <div className="qr-standee-head">
          <div className="qr-standee-label">
            <Store size={20} strokeWidth={2.1} fill="currentColor" />
            <span>{t("dashboard.qrTitle")}</span>
          </div>
          <div className="qr-standee-actions">
            <button type="button" className="inline-link-btn" onClick={shareQr} disabled={busy}>
              <Share2 size={18} strokeWidth={2.1} />
              <span>{t("dashboard.shareQr")}</span>
            </button>
            <button type="button" className="inline-link-btn" onClick={downloadQr} disabled={busy}>
              <Download size={18} strokeWidth={2.1} />
              <span>{t("dashboard.saveQr")}</span>
            </button>
          </div>
        </div>
        <div className="qr-frame-outer">
          <div className="qr-frame" ref={qrRef}>
            <QRCodeCanvas value={shopLink} size={192} includeMargin level="M" />
          </div>
        </div>
        <div className="qr-standee-foot">
          <div className="qr-counter-title">
            <Printer size={22} strokeWidth={2.1} />
            <p>{t("dashboard.putOnCounter")}</p>
          </div>
          <p className="qr-counter-text">{t("dashboard.qrText")}</p>
        </div>
      </section>

      <section className="link-card">
        <span className="eyebrow">{t("dashboard.yourLink")}</span>
        <div className="copy-row link-copy-shell">
          <div className="link-box">
            <Link2 size={20} strokeWidth={2.1} />
            <span className="link-text">{shortLink}</span>
          </div>
          <button type="button" className={`copy-btn ${copied ? "copied" : ""}`} onClick={copyLink}>
            {copied ? <Check size={18} strokeWidth={2.2} /> : <Copy size={18} strokeWidth={2.1} />}
            <span>{copied ? t("common.copied") : t("common.copy")}</span>
          </button>
        </div>
      </section>

      <section className="quick-actions">
        <Link href="/dashboard/menu" className="action-card">
          <div className="action-card-left">
            <div className="action-icon amber">
              <CollectionIcon size={32} strokeWidth={2} />
            </div>
            <div className="action-copy">
              <strong>{businessCopy.collectionAction}</strong>
              <span>{businessCopy.collectionDescription}</span>
            </div>
          </div>
          <ChevronRight size={28} strokeWidth={2} color="var(--muted)" />
        </Link>

        <Link href="/dashboard/orders" className="action-card primary">
          <div className="action-card-left">
            <div className="action-icon">
              <ReceiptText size={32} strokeWidth={2} />
            </div>
            <div className="action-copy">
              <strong className="action-title-row">
                {businessCopy.orderListTitle}
                {newOrders > 0 && (
                  <span className="badge-inline bounce">
                    {newOrders} {t("dashboard.newSuffix")}
                  </span>
                )}
              </strong>
              <span>{businessCopy.orderListText}</span>
            </div>
          </div>
          <ArrowRight size={28} strokeWidth={2} color="#fff" />
        </Link>
      </section>

      {editOpen && (
        <div className="sheet-backdrop" onClick={() => setEditOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <h2>{t("dashboard.editProfile")}</h2>
                <p className="muted" style={{ marginTop: "0.2rem" }}>
                  {t("dashboard.editProfileText")}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditOpen(false)}
                aria-label={t("common.cancel")}
              >
                <XCircle size={22} strokeWidth={2.1} />
              </button>
            </div>
            <BusinessProfileForm
              form={form}
              setForm={setForm}
              onSubmit={onUpdate}
              submitLabel={t("dashboard.saveProfile")}
              saving={saving}
              error={error}
              uploadingLogo={uploadingLogo}
              uploadingCover={uploadingCover}
              uploadingPaymentQr={uploadingPaymentQr}
              onUploadImage={onUploadImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
