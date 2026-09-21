"use client";

import { useEffect, useState } from "react";
import BusinessProfileForm from "../../components/dashboard/business-profile-form";
import OwnerHome from "../../components/dashboard/owner-home";
import { AppSkeleton } from "../../components/skeleton-screen";
import { useI18n } from "../../components/i18n-provider";
import { hasAnyOpeningHours, getIndiaDateString } from "../../components/opening-hours-fields";
import {
  EMPTY_BUSINESS_FORM,
  buildBusinessPayload,
  businessToForm,
  slugify,
} from "../../lib/business-form";
import { supabase } from "../../lib/supabaseClient";
import { uploadBusinessImage } from "../../lib/upload";

export default function DashboardHome() {
  const { t } = useI18n();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newOrders, setNewOrders] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BUSINESS_FORM);
  const [siteUrl, setSiteUrl] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingPaymentQr, setUploadingPaymentQr] = useState(false);
  const [closedTodaySaving, setClosedTodaySaving] = useState(false);

  useEffect(() => {
    setSiteUrl(window.location.origin);
    loadBusiness();
  }, []);

  useEffect(() => {
    function onNewOrder() {
      setNewOrders((n) => n + 1);
    }
    function onOrderUpdated(event) {
      const order = event.detail;
      if (order?.status === "done" || order?.status === "cancelled") {
        setNewOrders((n) => Math.max(0, n - 1));
      }
    }
    window.addEventListener("dukaanlink-new-order", onNewOrder);
    window.addEventListener("dukaanlink-order-updated", onOrderUpdated);
    return () => {
      window.removeEventListener("dukaanlink-new-order", onNewOrder);
      window.removeEventListener("dukaanlink-order-updated", onOrderUpdated);
    };
  }, []);

  async function loadBusiness() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (loadError && /relation .* does not exist/i.test(loadError.message)) {
      setError(t("dashboard.missingTables"));
    } else if (!loadError && data) {
      setBusiness(data);
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("business_id", data.id)
        .not("status", "in", "(done,cancelled)");
      setNewOrders(count || 0);
    }
    setLoading(false);
  }

  function openEdit() {
    if (!business) return;
    setForm(businessToForm(business));
    setError("");
    setEditOpen(true);
  }

  async function handleImageUpload(kind, file) {
    if (!file) return;
    const setters = {
      cover: setUploadingCover,
      logo: setUploadingLogo,
      payment: setUploadingPaymentQr,
    };
    const setUploading = setters[kind] || setUploadingLogo;
    setUploading(true);
    setError("");

    const folder = kind === "payment" ? "payment-qr" : kind;
    const { url, error: uploadError } = await uploadBusinessImage(file, folder);
    setUploading(false);

    if (uploadError) {
      setError(uploadError);
      return;
    }

    const field =
      kind === "cover" ? "cover_url" : kind === "payment" ? "payment_qr_url" : "logo_url";
    setForm((prev) => ({ ...prev, [field]: url }));
  }

  function notifyBusinessUpdated(data) {
    window.dispatchEvent(
      new CustomEvent("dukaanlink-business-updated", {
        detail: { category: data.category || "" },
      })
    );
  }

  function mapSaveError(message) {
    return /column|relation/i.test(message) ? t("dashboard.rerunSchema") : message;
  }

  async function handleToggleClosedToday(nextOn) {
    if (!business || closedTodaySaving) return;
    setClosedTodaySaving(true);
    setError("");

    const value = nextOn ? getIndiaDateString() : null;

    const { data, error: saveError } = await supabase
      .from("businesses")
      .update({ closed_today_date: value })
      .eq("id", business.id)
      .select()
      .single();

    setClosedTodaySaving(false);

    if (saveError) {
      setError(mapSaveError(saveError.message));
      return;
    }

    setBusiness(data);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const hoursPayload = hasAnyOpeningHours(form.opening_hours) ? form.opening_hours : null;
    const slug = `${slugify(form.name)}-${Math.floor(Math.random() * 900 + 100)}`;

    const { data, error: saveError } = await supabase
      .from("businesses")
      .insert({
        owner_id: userData.user.id,
        slug,
        ...buildBusinessPayload(form, hoursPayload),
      })
      .select()
      .single();

    setSaving(false);
    if (saveError) {
      setError(mapSaveError(saveError.message));
      return;
    }

    setBusiness(data);
    notifyBusinessUpdated(data);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!business) return;
    setError("");
    setSaving(true);

    const hoursPayload = hasAnyOpeningHours(form.opening_hours) ? form.opening_hours : null;
    const { data, error: saveError } = await supabase
      .from("businesses")
      .update(buildBusinessPayload(form, hoursPayload))
      .eq("id", business.id)
      .select()
      .single();

    setSaving(false);
    if (saveError) {
      setError(mapSaveError(saveError.message));
      return;
    }

    setBusiness(data);
    setEditOpen(false);
    notifyBusinessUpdated(data);
  }

  if (loading) return <AppSkeleton variant="dashboard" />;

  if (!business) {
    return (
      <div className="page form-shell">
        <h1>{t("dashboard.setupTitle")}</h1>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          {t("dashboard.setupText")}
        </p>
        <BusinessProfileForm
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          submitLabel={t("dashboard.create")}
          saving={saving}
          error={error}
          uploadingLogo={uploadingLogo}
          uploadingCover={uploadingCover}
          uploadingPaymentQr={uploadingPaymentQr}
          onUploadImage={handleImageUpload}
        />
      </div>
    );
  }

  return (
    <OwnerHome
      business={business}
      form={form}
      setForm={setForm}
      newOrders={newOrders}
      siteUrl={siteUrl}
      editOpen={editOpen}
      setEditOpen={(open) => {
        if (open) openEdit();
        else setEditOpen(false);
      }}
      onUpdate={handleUpdate}
      onToggleClosedToday={handleToggleClosedToday}
      closedTodaySaving={closedTodaySaving}
      saving={saving}
      error={error}
      uploadingLogo={uploadingLogo}
      uploadingCover={uploadingCover}
      uploadingPaymentQr={uploadingPaymentQr}
      onUploadImage={handleImageUpload}
    />
  );
}
