"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppSkeleton } from "../../../components/skeleton-screen";
import { supabase } from "../../../lib/supabaseClient";
import { Boxes, Camera, Check, Pencil, PlusCircle, Trash2, X, XCircle } from "lucide-react";
import { getBusinessCopy, getBusinessMode } from "../../../lib/business-config";
import {
  formatItemQuantity,
  parseQuantityInput,
  usesItemQuantity,
} from "../../../lib/quantity-units";
import { useI18n } from "../../../components/i18n-provider";
import QuantityField from "../../../components/dashboard/quantity-field";
import StockStepper from "../../../components/dashboard/stock-stepper";
import "./menu.css";

const emptyItem = {
  name: "",
  price: "",
  description: "",
  photo_url: "",
  quantity: "",
  quantity_unit: "piece",
};

function itemToForm(item) {
  return {
    name: item.name || "",
    price: item.price == null ? "" : String(item.price),
    description: item.description || "",
    photo_url: item.photo_url || "",
    quantity: item.quantity == null || item.quantity === "" ? "" : String(item.quantity),
    quantity_unit: item.quantity_unit || "piece",
  };
}

export default function MenuPage() {
  const { locale, t } = useI18n();
  const [businessId, setBusinessId] = useState(null);
  const [businessCategory, setBusinessCategory] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyItem);
  const [editingId, setEditingId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stockSavingId, setStockSavingId] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }
    const { data: business } = await supabase
      .from("businesses")
      .select("id, category")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!business) {
      setLoading(false);
      return;
    }
    setBusinessId(business.id);
    setBusinessCategory(business.category || "");
    await loadItems(business.id);
    setLoading(false);
  }

  async function loadItems(bizId) {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyItem);
    setError("");
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyItem);
    setError("");
    setSheetOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setError("");
    setSheetOpen(true);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setUploading(true);
    setError("");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${businessId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("menu-photos")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (uploadError) {
      setError(
        uploadError.message.includes("Bucket not found")
          ? t("menu.storageMissing")
          : uploadError.message
      );
      return;
    }
    const { data } = supabase.storage.from("menu-photos").getPublicUrl(path);
    setForm((prev) => ({ ...prev, photo_url: data.publicUrl }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.price) {
      setError(t("menu.namePriceRequired"));
      return;
    }
    setSaving(true);

    const qty = parseQuantityInput(form.quantity);
    const fields = {
      name: form.name,
      price: parseFloat(form.price),
      description: form.description || null,
      photo_url: form.photo_url || null,
      quantity: qty,
      quantity_unit: qty == null ? null : form.quantity_unit || "piece",
    };

    const { error: saveError } = editingId
      ? await supabase.from("menu_items").update(fields).eq("id", editingId)
      : await supabase.from("menu_items").insert({
          ...fields,
          business_id: businessId,
          in_stock: true,
        });

    setSaving(false);
    if (saveError) {
      setError(
        /quantity|description|column/i.test(saveError.message)
          ? t("menu.schemaMissing")
          : saveError.message
      );
      return;
    }
    closeSheet();
    loadItems(businessId);
  }

  async function toggleStock(item) {
    await supabase.from("menu_items").update({ in_stock: !item.in_stock }).eq("id", item.id);
    loadItems(businessId);
  }

  async function bumpStock(item, delta) {
    if (stockSavingId) return;
    const unit = item.quantity_unit || "piece";
    const current = item.quantity == null ? 0 : Number(item.quantity);
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);

    setStockSavingId(item.id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, quantity: next, quantity_unit: unit } : row
      )
    );

    const { error: updateError } = await supabase
      .from("menu_items")
      .update({ quantity: next, quantity_unit: unit })
      .eq("id", item.id);

    setStockSavingId(null);
    if (updateError) {
      setError(
        /quantity|column/i.test(updateError.message)
          ? t("menu.schemaMissing")
          : updateError.message
      );
      loadItems(businessId);
    }
  }

  async function startTracking(item) {
    if (stockSavingId) return;
    setStockSavingId(item.id);
    const unit = "piece";
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id ? { ...row, quantity: 1, quantity_unit: unit } : row
      )
    );
    const { error: updateError } = await supabase
      .from("menu_items")
      .update({ quantity: 1, quantity_unit: unit })
      .eq("id", item.id);
    setStockSavingId(null);
    if (updateError) {
      setError(
        /quantity|column/i.test(updateError.message)
          ? t("menu.schemaMissing")
          : updateError.message
      );
      loadItems(businessId);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", deleteTarget.id);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setDeleteTarget(null);
    loadItems(businessId);
  }

  const businessCopy = getBusinessCopy(businessCategory, locale);
  const mode = getBusinessMode(businessCategory);
  const showQuantity = usesItemQuantity(mode);
  const isEditing = Boolean(editingId);

  if (loading) return <AppSkeleton variant="menu" />;

  if (!businessId) {
    return (
      <div className="page">
        <p>{t("menu.setPageFirst")}</p>
        <Link href="/dashboard" className="primary-cta" style={{ marginTop: "1rem" }}>
          {t("dashboard.goQr")}
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="surface-strip">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Boxes size={20} strokeWidth={2.1} color="var(--primary)" />
          <strong>{businessCopy.collectionHeader}</strong>
        </div>
        <span className="count-pill">
          {items.length} {t("menu.items")}
        </span>
      </div>

      {showQuantity && items.length > 0 && (
        <div className="stock-tip">
          <strong>{t("menu.stockTipTitle")}</strong>
          <span>{t("menu.stockTipText")}</span>
        </div>
      )}

      {error && !sheetOpen ? <p className="error-text">{error}</p> : null}

      {items.length === 0 && (
        <p className="empty-state">{businessCopy.listEmpty}</p>
      )}

      {items.map((item) => (
        <div className={`menu-card ${item.in_stock ? "" : "off"}`} key={item.id}>
          {item.photo_url ? (
            <div className="menu-thumb">
              <img src={item.photo_url} alt="" style={item.in_stock ? undefined : { filter: "grayscale(1)" }} />
            </div>
          ) : (
            <div className="menu-thumb" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
              <Boxes size={28} strokeWidth={2} />
            </div>
          )}
          <div className="menu-copy">
            <h3 style={{ textDecoration: item.in_stock ? "none" : "line-through" }}>{item.name}</h3>
            <div className="menu-price">₹{item.price}</div>
            {showQuantity && item.quantity != null ? (
              <div className="menu-stock-line">{formatItemQuantity(item)}</div>
            ) : null}
            <div className={`menu-status ${item.in_stock ? "ok" : "bad"}`}>
              <span className={`menu-dot ${item.in_stock ? "ok" : "bad"}`} />
              {item.in_stock ? businessCopy.availabilityOn : businessCopy.availabilityOff}
            </div>
            {showQuantity && (
              <div className="menu-stock-controls">
                {item.quantity == null ? (
                  <button
                    type="button"
                    className="tiny-link"
                    disabled={stockSavingId === item.id}
                    onClick={() => startTracking(item)}
                  >
                    {t("menu.trackStock")}
                  </button>
                ) : (
                  <StockStepper
                    item={item}
                    saving={stockSavingId === item.id}
                    onBump={bumpStock}
                  />
                )}
              </div>
            )}
          </div>
          <div className="availability menu-card-actions">
            <button
              type="button"
              className={`availability-toggle ${item.in_stock ? "on" : ""}`}
              onClick={() => toggleStock(item)}
              aria-label="Toggle available"
            >
              <span>{item.in_stock ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2.5} />}</span>
            </button>
            <div className="availability-label">{item.in_stock ? t("menu.available") : t("menu.off")}</div>
            <div className="menu-card-links">
              <button type="button" className="tiny-link" onClick={() => openEdit(item)}>
                {t("menu.edit")}
              </button>
              <button type="button" className="tiny-link" onClick={() => setDeleteTarget(item)}>
                {t("menu.delete")}
              </button>
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="primary-cta" onClick={openCreate}>
        <PlusCircle size={20} strokeWidth={2.1} />
        {businessCopy.addItem}
      </button>

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <h2>{isEditing ? t("menu.editItemTitle") : businessCopy.addItemTitle}</h2>
                <p className="muted" style={{ marginTop: "0.2rem" }}>
                  {isEditing ? t("menu.editItemText") : businessCopy.addItemDescription}
                </p>
              </div>
              <button type="button" className="icon-button" onClick={closeSheet} aria-label={t("common.cancel")}>
                <XCircle size={22} strokeWidth={2.1} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="field-row">
                <label>{businessCopy.photoLabel}</label>
                <div className="sheet-photo-row">
                  <div className="photo-placeholder">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="" />
                    ) : (
                      <>
                        <Camera size={28} strokeWidth={2} />
                        <span style={{ fontSize: "0.75rem" }}>{t("menu.noPhoto")}</span>
                      </>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label htmlFor="dish-photo-upload" className="secondary-cta" style={{ cursor: "pointer" }}>
                      <Camera size={18} strokeWidth={2.1} />
                      {t("menu.choosePhoto")}
                    </label>
                    <input
                      id="dish-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                    <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.35rem" }}>
                      {uploading ? "Uploading..." : t("menu.choosePhotoHint")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="field-row">
                <label>{businessCopy.itemNameLabel}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={businessCopy.itemNamePlaceholder}
                  required
                />
              </div>
              <div className="field-row">
                <label>{t("menu.price")}</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
              {showQuantity && (
                <QuantityField
                  quantity={form.quantity}
                  unit={form.quantity_unit}
                  onChange={({ quantity, unit }) =>
                    setForm((prev) => ({ ...prev, quantity, quantity_unit: unit }))
                  }
                />
              )}
              <div className="field-row">
                <label>{t("menu.shortNote")}</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={businessCopy.shortNotePlaceholder}
                />
              </div>
              {error && <p className="error-text">{error}</p>}
              <div className="form-actions-equal">
                <button type="button" className="ghost-cta" onClick={closeSheet}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="primary-cta" disabled={saving || uploading}>
                  {isEditing ? <Pencil size={18} strokeWidth={2.2} /> : <Check size={18} strokeWidth={2.2} />}
                  <span>
                    {saving ? "Saving..." : isEditing ? t("menu.saveChanges") : t("menu.saveDish")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="confirm-backdrop"
          onClick={() => !deleting && setDeleteTarget(null)}
          role="presentation"
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-item-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon theme">
              <Trash2 size={26} strokeWidth={2.1} />
            </div>
            <h2 id="delete-item-title">{t("menu.deleteTitle")}</h2>
            <p className="confirm-lead">
              <strong>{deleteTarget.name}</strong>
              {deleteTarget.price != null ? ` · ₹${deleteTarget.price}` : ""}
            </p>
            <p className="confirm-text">{t("menu.deleteText")}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost-cta"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-cta"
                disabled={deleting}
                onClick={confirmDelete}
              >
                <Trash2 size={18} strokeWidth={2.2} />
                {deleting ? t("menu.deleting") : t("menu.deleteAction")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
