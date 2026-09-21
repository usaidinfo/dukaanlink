"use client";

import BusinessCategorySelect from "../business-category-select";
import SeoFields from "../seo-fields";
import {
  OpeningHoursFields,
  hasAnyOpeningHours,
  normalizeOpeningHours,
} from "../opening-hours-fields";
import { useI18n } from "../i18n-provider";
import { getCategoryOptions } from "../../lib/business-form";
import ImageUploadField from "./image-upload-field";
import PaymentFields from "./payment-fields";

export default function BusinessProfileForm({
  form,
  setForm,
  onSubmit,
  submitLabel,
  saving,
  error,
  uploadingLogo,
  uploadingCover,
  uploadingPaymentQr,
  onUploadImage,
}) {
  const { t } = useI18n();
  const categoryOptions = getCategoryOptions(t);
  const hoursValue = hasAnyOpeningHours(form.opening_hours)
    ? normalizeOpeningHours(form.opening_hours)
    : form.opening_hours;

  return (
    <form onSubmit={onSubmit}>
      <div className="field-row">
        <label>{t("dashboard.name")}</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Usaid's Kitchen"
        />
      </div>

      <div className="two-col">
        <div className="field-row">
          <label>{t("dashboard.type")}</label>
          <BusinessCategorySelect
            value={form.category}
            onChange={(category) => setForm({ ...form, category })}
            options={categoryOptions}
            ariaLabel={t("dashboard.type")}
          />
        </div>
        <div className="field-row">
          <label>{t("dashboard.city")}</label>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Bhopal"
          />
        </div>
      </div>

      <div className="field-row">
        <label>{t("dashboard.whatsapp")}</label>
        <input
          required
          value={form.whatsapp_number}
          onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
          placeholder="10-digit mobile"
        />
      </div>

      <div className="field-row">
        <label>{t("dashboard.area")}</label>
        <input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Kolar Road"
        />
      </div>

      <div className="field-row">
        <label>{t("dashboard.about")}</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder={t("dashboard.aboutPlaceholder")}
        />
      </div>

      <ImageUploadField
        id="logo-upload"
        label={t("dashboard.logoUrl")}
        value={form.logo_url}
        uploading={uploadingLogo}
        uploadLabel={t("dashboard.uploadLogo")}
        uploadingLabel={t("dashboard.uploadingPhoto")}
        variant="logo"
        onUpload={(file) => onUploadImage("logo", file)}
      />

      <ImageUploadField
        id="cover-upload"
        label={t("dashboard.coverUrl")}
        value={form.cover_url}
        uploading={uploadingCover}
        uploadLabel={t("dashboard.uploadCover")}
        uploadingLabel={t("dashboard.uploadingPhoto")}
        variant="cover"
        onUpload={(file) => onUploadImage("cover", file)}
      />

      <PaymentFields
        value={form}
        onChange={setForm}
        uploading={uploadingPaymentQr}
        onUploadQr={(file) => onUploadImage("payment", file)}
      />

      <OpeningHoursFields
        value={hoursValue}
        onChange={(opening_hours) => setForm({ ...form, opening_hours })}
      />

      <SeoFields value={form} onChange={setForm} />

      {error ? <p className="error-text">{error}</p> : null}

      <button
        className="primary-cta"
        disabled={saving || uploadingCover || uploadingLogo || uploadingPaymentQr}
        style={{ marginTop: "1rem" }}
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
