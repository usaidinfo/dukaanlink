"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppSkeleton } from "../../../components/skeleton-screen";
import { supabase } from "../../../lib/supabaseClient";
import { Boxes, Camera, Check, Pencil, Plus, Search, Trash2, X, XCircle } from "lucide-react";
import { getBusinessCopy, getBusinessMode } from "../../../lib/business-config";
import {
  formatItemQuantity,
  parseQuantityInput,
  usesItemQuantity,
} from "../../../lib/quantity-units";
import { useI18n } from "../../../components/i18n-provider";
import GstOptionsField from "../../../components/dashboard/gst-options-field";
import StockTrackingField from "../../../components/dashboard/stock-tracking-field";
import {
  VoiceMicButton,
  VoiceStatus,
  isLowParseConfidence,
  parseVoiceItem,
  useVoiceRecorder,
} from "../../../components/dashboard/voice-item-input";
import StockStepper from "../../../components/dashboard/stock-stepper";
import ItemVariantsEditor from "../../../components/dashboard/item-variants-editor";
import {
  isPersistedVariantId,
  itemHasVariants,
  itemPriceRange,
  variantLabels,
} from "../../../lib/item-variants";
import { normalizeGst } from "../../../lib/gst";
import {
  crossedLowStockThreshold,
  emitLowStockAlert,
  isLowStock,
  isStockTracking,
} from "../../../lib/stock-alerts";
import StarterCatalog from "../../../components/dashboard/starter-catalog";
import "../../../components/dashboard/starter-catalog.css";
import {
  isKiranaStarterShop,
  remainingKiranaStarter,
  getUsedStarterIds,
  rememberUsedStarterIds,
} from "../../../lib/starter-catalog-kirana";
import LazyImage from "../../../components/lazy-image";
import { useVisibleWindow } from "../../../lib/use-visible-window";
import "./menu.css";

const emptyItem = {
  name: "",
  price: "",
  description: "",
  photo_url: "",
  quantity: "",
  quantity_unit: "piece",
  gst_mode: "no_gst",
  gst_rate: "",
  stock_tracking_enabled: false,
  alert_below: "",
};

function itemToForm(item) {
  const gst = normalizeGst(item);
  const tracking = isStockTracking(item);
  return {
    name: item.name || "",
    price: item.price == null ? "" : String(item.price),
    description: item.description || "",
    photo_url: item.photo_url || "",
    quantity: item.quantity == null || item.quantity === "" ? "" : String(item.quantity),
    quantity_unit: item.quantity_unit || "piece",
    gst_mode: gst.gst_mode,
    gst_rate: gst.gst_rate == null ? "" : String(gst.gst_rate),
    stock_tracking_enabled: tracking,
    alert_below: item.alert_below == null || item.alert_below === "" ? "5" : String(item.alert_below),
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
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variants, setVariants] = useState([]);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [priceNeedsReview, setPriceNeedsReview] = useState(false);
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterSaving, setStarterSaving] = useState(false);
  const [usedStarterIds, setUsedStarterIds] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState("");

  const voice = useVoiceRecorder({
    onTranscript: (text) => {
      const heard = String(text || "").trim();
      setVoiceTranscript(heard);
      setVoiceError("");
      const parsed = parseVoiceItem(heard);
      openCreate({
        name: parsed.name || "",
        price: parsed.price == null ? "" : String(parsed.price),
      });
      setPriceNeedsReview(isLowParseConfidence(parsed));
    },
    onError: setVoiceError,
  });

  function resetVoice() {
    setVoiceTranscript("");
    setVoiceError("");
    setPriceNeedsReview(false);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (!businessId) return;
    setUsedStarterIds(getUsedStarterIds(businessId));
  }, [businessId]);

  useEffect(() => {
    if (loading || !businessId || !isKiranaStarterShop(businessCategory)) return;
    if (items.length > 0) return;
    if (!remainingKiranaStarter(items, usedStarterIds).length) return;
    try {
      if (sessionStorage.getItem(`starter-skip-${businessId}`)) return;
    } catch {
      /* ignore */
    }
    setStarterOpen(true);
  }, [loading, businessId, businessCategory, items.length]);

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
    let { data, error } = await supabase
      .from("menu_items")
      .select("*, item_variants(*)")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false });

    if (error) {
      const retry = await supabase
        .from("menu_items")
        .select("*")
        .eq("business_id", bizId)
        .order("created_at", { ascending: false });
      data = retry.data;
    }
    setItems(data || []);
  }

  function resetVariants() {
    setVariantsEnabled(false);
    setVariants([]);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyItem);
    resetVariants();
    resetVoice();
    setError("");
  }

  function openCreate(prefill = null) {
    setEditingId(null);
    setForm(prefill ? { ...emptyItem, ...prefill } : emptyItem);
    resetVariants();
    if (!prefill) resetVoice();
    setError("");
    setSheetOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    const rows = item.item_variants || [];
    setVariantsEnabled(rows.length > 0);
    setVariants(rows);
    resetVoice();
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

  async function syncVariants(menuItemId) {
    const existing = await supabase
      .from("item_variants")
      .select("id")
      .eq("menu_item_id", menuItemId);

    if (existing.error) {
      return existing.error;
    }

    const keepIds = new Set();
    if (variantsEnabled) {
      for (const [index, row] of variants.entries()) {
        const payload = {
          menu_item_id: menuItemId,
          variant_type: row.variant_type,
          label: row.label,
          color_hex: row.variant_type === "color" ? row.color_hex || null : null,
          price: Number(row.price),
          in_stock: row.in_stock !== false,
          sort_order: index,
        };

        if (isPersistedVariantId(row.id)) {
          keepIds.add(row.id);
          const { error } = await supabase.from("item_variants").update(payload).eq("id", row.id);
          if (error) return error;
        } else {
          const { data, error } = await supabase.from("item_variants").insert(payload).select("id").single();
          if (error) return error;
          if (data?.id) keepIds.add(data.id);
        }
      }
    }

    const staleIds = (existing.data || []).map((row) => row.id).filter((id) => !keepIds.has(id));
    if (staleIds.length) {
      const { error } = await supabase.from("item_variants").delete().in("id", staleIds);
      if (error) return error;
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const pricedVariants = variantsEnabled
      ? variants.filter((row) => String(row.label || "").trim() && String(row.price).trim() !== "")
      : [];

    if (!form.name) {
      setError(t("menu.namePriceRequired"));
      return;
    }
    if (variantsEnabled) {
      if (!pricedVariants.length || pricedVariants.length !== variants.length) {
        setError(t("menu.variantPriceRequired"));
        return;
      }
    } else if (!form.price) {
      setError(t("menu.namePriceRequired"));
      return;
    }

    setSaving(true);

    const tracking = Boolean(form.stock_tracking_enabled);
    const qty = tracking ? parseQuantityInput(form.quantity) ?? 0 : parseQuantityInput(form.quantity);
    const gst = normalizeGst({
      gst_mode: form.gst_mode,
      gst_rate: form.gst_rate,
    });
    const fallbackPrice = variantsEnabled
      ? Number(pricedVariants[0].price)
      : parseFloat(form.price);
    const fields = {
      name: form.name,
      price: fallbackPrice,
      description: form.description || null,
      photo_url: form.photo_url || null,
      quantity: qty,
      quantity_unit: qty == null && !tracking ? null : form.quantity_unit || "piece",
      gst_mode: gst.gst_mode,
      gst_rate: gst.gst_mode === "no_gst" ? null : gst.gst_rate,
      stock_tracking_enabled: tracking,
      alert_below: tracking ? parseQuantityInput(form.alert_below) ?? 5 : null,
    };
    if (!tracking && qty == null) {
      fields.quantity = null;
      fields.quantity_unit = null;
    }

    const persist = (payload) =>
      editingId
        ? supabase.from("menu_items").update(payload).eq("id", editingId).select("id").single()
        : supabase
            .from("menu_items")
            .insert({
              ...payload,
              business_id: businessId,
              in_stock: true,
            })
            .select("id")
            .single();

    let saved = await persist(fields);
    if (saved.error && /gst_|stock_tracking|alert_below/i.test(saved.error.message)) {
      if (gst.gst_mode !== "no_gst" || tracking) {
        setSaving(false);
        setError(t("menu.schemaMissing"));
        return;
      }
      const {
        gst_mode: _gstMode,
        gst_rate: _gstRate,
        stock_tracking_enabled: _tracking,
        alert_below: _alert,
        ...legacy
      } = fields;
      saved = await persist(legacy);
    }

    if (saved.error) {
      setSaving(false);
      setError(
        /quantity|gst_|stock_tracking|alert_below|description|column/i.test(saved.error.message)
          ? t("menu.schemaMissing")
          : saved.error.message
      );
      return;
    }

    if (editingId) {
      const prev = items.find((row) => row.id === editingId);
      const nextItem = { ...(prev || {}), ...fields, name: fields.name };
      if (crossedLowStockThreshold(prev, nextItem)) {
        emitLowStockAlert(nextItem);
      }
    }

    const variantError = await syncVariants(saved.data.id);
    setSaving(false);
    if (variantError) {
      setError(
        /item_variants|relation/i.test(variantError.message)
          ? t("menu.schemaMissingVariants")
          : variantError.message
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
    const nextItem = { ...item, quantity: next, quantity_unit: unit };
    setItems((prev) => prev.map((row) => (row.id === item.id ? nextItem : row)));
    if (crossedLowStockThreshold(item, nextItem)) {
      emitLowStockAlert(nextItem);
    }

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

  function closeStarter(skipped = false) {
    if (skipped && businessId) {
      try {
        sessionStorage.setItem(`starter-skip-${businessId}`, "1");
      } catch {
        /* ignore */
      }
    }
    setStarterOpen(false);
  }

  async function saveStarterItems(rows) {
    if (!businessId || !rows.length || starterSaving) return;
    setStarterSaving(true);
    setError("");
    const payload = rows
      .filter((row) => Number(row.price) > 0)
      .map((row) => ({
        business_id: businessId,
        name: row.name,
        price: Number(row.price),
        photo_url: row.photo_url,
        category: row.category,
        in_stock: true,
        sort_order: row.sort_order,
      }));
    if (!payload.length) {
      setStarterSaving(false);
      setError(t("menu.starterNeedPrice"));
      return;
    }
    const { error: saveError } = await supabase.from("menu_items").insert(payload);
    setStarterSaving(false);
    if (saveError) {
      setError(
        /column|relation/i.test(saveError.message) ? t("menu.schemaMissing") : saveError.message
      );
      return;
    }
    setUsedStarterIds(
      rememberUsedStarterIds(
        businessId,
        rows.filter((row) => Number(row.price) > 0).map((row) => row.starter_id)
      )
    );
    setStarterOpen(false);
    await loadItems(businessId);
  }

  const businessCopy = getBusinessCopy(businessCategory, locale);
  const mode = getBusinessMode(businessCategory);
  const showQuantity = usesItemQuantity(mode);
  const hasTrackedStock = items.some((item) => isStockTracking(item));
  const isEditing = Boolean(editingId);
  const showStarter = isKiranaStarterShop(businessCategory);
  const starterRemaining = showStarter ? remainingKiranaStarter(items, usedStarterIds) : [];
  const filteredItems = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const variants = (item.item_variants || [])
        .map((row) => String(row.label || "").toLowerCase())
        .join(" ");
      return (
        name.includes(q) ||
        description.includes(q) ||
        category.includes(q) ||
        variants.includes(q)
      );
    });
  }, [items, catalogQuery]);
  const { visibleCount, remaining, hasMore, loadMore } = useVisibleWindow(
    filteredItems.length,
    catalogQuery
  );
  const visibleItems = filteredItems.slice(0, visibleCount);

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
        <div className="menu-strip-actions">
          {starterRemaining.length > 0 ? (
            <button type="button" className="starter-list-link" onClick={() => setStarterOpen(true)}>
              {t("menu.starterFromList")}
            </button>
          ) : null}
          <span className="count-pill">
            {filteredItems.length} {t("menu.items")}
          </span>
        </div>
      </div>

      {showQuantity && hasTrackedStock && (
        <div className="stock-tip">
          <strong>{t("menu.stockTipTitle")}</strong>
          <span>{t("menu.stockTipText")}</span>
        </div>
      )}

      {error && !sheetOpen && !starterOpen ? <p className="error-text">{error}</p> : null}

      {items.length > 0 ? (
        <div className="shop-search menu-search">
          <Search size={18} strokeWidth={2.1} />
          <input
            type="search"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            placeholder={t("menu.searchPlaceholder")}
            aria-label={t("menu.searchPlaceholder")}
          />
          {catalogQuery ? (
            <button
              type="button"
              className="shop-search-clear"
              onClick={() => setCatalogQuery("")}
              aria-label={t("common.cancel")}
            >
              <X size={16} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      ) : null}

      {items.length === 0 && (
        showStarter && starterRemaining.length > 0 ? (
          <div className="starter-empty-actions">
            <p className="empty-state">{businessCopy.listEmpty}</p>
            <button type="button" className="primary-cta" onClick={() => setStarterOpen(true)}>
              {t("menu.starterEmptyCta")}
            </button>
            <button type="button" className="starter-skip" onClick={() => openCreate()}>
              {t("menu.starterAddOwn")}
            </button>
          </div>
        ) : (
          <p className="empty-state">{businessCopy.listEmpty}</p>
        )
      )}

      {items.length > 0 && filteredItems.length === 0 ? (
        <p className="empty-state">{t("menu.searchEmpty")}</p>
      ) : null}

      {visibleItems.map((item) => (
        <div className={`menu-card ${item.in_stock ? "" : "off"}`} key={item.id}>
          {item.photo_url ? (
            <div className="menu-thumb">
              <LazyImage
                src={item.photo_url}
                style={item.in_stock ? undefined : { filter: "grayscale(1)" }}
              />
            </div>
          ) : (
            <div className="menu-thumb" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
              <Boxes size={28} strokeWidth={2} />
            </div>
          )}
          <div className="menu-copy">
            <h3 style={{ textDecoration: item.in_stock ? "none" : "line-through" }}>{item.name}</h3>
            {itemHasVariants(item) && variantLabels(item) ? (
              <div className="menu-variant-line">{variantLabels(item)}</div>
            ) : null}
            <div className="menu-price">
              {itemHasVariants(item)
                ? t("menu.variantsFrom").replace("{price}", String(itemPriceRange(item).min))
                : `₹${item.price}`}
            </div>
            {showQuantity && isStockTracking(item) && formatItemQuantity(item) ? (
              <div className="menu-stock-line">
                {t("menu.availableStock").replace("{qty}", formatItemQuantity(item))}
              </div>
            ) : null}
            {isLowStock(item) ? <span className="menu-low-stock">{t("menu.lowStock")}</span> : null}
            <div className={`menu-status ${item.in_stock ? "ok" : "bad"}`}>
              <span className={`menu-dot ${item.in_stock ? "ok" : "bad"}`} />
              {item.in_stock ? businessCopy.availabilityOn : businessCopy.availabilityOff}
            </div>
            {showQuantity && isStockTracking(item) ? (
              <div className="menu-stock-controls">
                <StockStepper
                  item={item}
                  saving={stockSavingId === item.id}
                  onBump={bumpStock}
                />
              </div>
            ) : null}
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
      {hasMore ? (
        <button type="button" className="list-load-more" onClick={loadMore}>
          {t("common.loadMoreLeft").replace("{count}", String(remaining))}
        </button>
      ) : null}

      {!sheetOpen && !starterOpen ? (
        <>
          <VoiceStatus
            phase={voice.phase}
            error={voiceError}
            transcript={voiceTranscript}
            liveText={voice.liveText}
          />
          <VoiceMicButton
            listening={voice.listening}
            busy={voice.busy}
            onClick={voice.toggle}
          />
          <button
            type="button"
            className="menu-fab"
            onClick={() => openCreate()}
            aria-label={businessCopy.addItem}
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </>
      ) : null}

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
              {voiceTranscript && !isEditing ? (
                <p className="voice-heard-line">
                  {t("menu.voiceHeard")}: {voiceTranscript}
                </p>
              ) : null}
              <div className="field-row">
                <label>{businessCopy.itemNameLabel}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={businessCopy.itemNamePlaceholder}
                  required
                />
              </div>
              {!variantsEnabled ? (
                <div className="field-row">
                  <label>{t("menu.price")}</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => {
                      setForm({ ...form, price: e.target.value });
                      setPriceNeedsReview(false);
                    }}
                    placeholder="0"
                    required
                    className={priceNeedsReview ? "price-needs-review" : undefined}
                  />
                  {priceNeedsReview ? (
                    <p className="muted" style={{ fontSize: "0.76rem", marginTop: "0.35rem", color: "#b45309" }}>
                      {t("menu.voiceCheckPrice")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="field-row">
                <label>{t("menu.shortNote")}</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={businessCopy.shortNotePlaceholder}
                />
              </div>
              <ItemVariantsEditor
                key={editingId || "new"}
                enabled={variantsEnabled}
                onEnabledChange={setVariantsEnabled}
                variants={variants}
                onChange={setVariants}
              />
              <GstOptionsField
                gstMode={form.gst_mode}
                gstRate={form.gst_rate}
                onChange={({ gst_mode, gst_rate }) =>
                  setForm((prev) => ({ ...prev, gst_mode, gst_rate }))
                }
              />
              {showQuantity && (
                <StockTrackingField
                  enabled={form.stock_tracking_enabled}
                  quantity={form.quantity}
                  unit={form.quantity_unit}
                  alertBelow={form.alert_below}
                  onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
                />
              )}
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

      {starterOpen ? (
        <StarterCatalog
          existingItems={items}
          usedIds={usedStarterIds}
          saving={starterSaving}
          error={error}
          onClose={() => closeStarter(true)}
          onSave={saveStarterItems}
        />
      ) : null}
    </div>
  );
}
