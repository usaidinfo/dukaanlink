"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppSkeleton } from "../../../components/skeleton-screen";
import { supabase } from "../../../lib/supabaseClient";
import { BellRing, CheckCircle2, Flag, Flame, IndianRupee, ScrollText, Share2, Volume2, VolumeX, XCircle } from "lucide-react";
import { getBusinessCopy } from "../../../lib/business-config";
import { useI18n } from "../../../components/i18n-provider";
import OrderQuickReplies from "../../../components/dashboard/order-quick-replies";
import OrderDateFilter from "../../../components/dashboard/order-date-filter";
import { buildMonthlyRepeatMap, formatRepeatLabel } from "../../../lib/customer-stats";
import {
  filterOrdersByRange,
  getNextOrderStatus,
  isActiveOrderStatus,
  summarizeOrders,
  toDateInputValue,
} from "../../../lib/order-range";
import {
  buildDailySummaryMessage,
  buildWhatsAppShareLink,
  toWhatsAppDigits,
} from "../../../lib/whatsapp";
import {
  getNotificationPermission,
  isOrderSoundEnabled,
  playOrderChime,
  requestBrowserNotifications,
  setOrderSoundEnabled,
} from "../../../lib/order-alerts";
import "./orders.css";

export default function OrdersPage() {
  const { locale, t } = useI18n();
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [orders, setOrders] = useState([]);
  const [flaggedByPhone, setFlaggedByPhone] = useState({});
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [notifyPerm, setNotifyPerm] = useState("default");
  const [rangePreset, setRangePreset] = useState("today");
  const [customDate, setCustomDate] = useState(() => toDateInputValue(new Date()));
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [flagTarget, setFlagTarget] = useState(null);
  const [flagNote, setFlagNote] = useState("");
  const [flagging, setFlagging] = useState(false);
  const [flagError, setFlagError] = useState("");
  const [statusTab, setStatusTab] = useState("active");

  useEffect(() => {
    setSoundOn(isOrderSoundEnabled());
    setNotifyPerm(getNotificationPermission());
    init();
  }, []);

  useEffect(() => {
    function onNewOrder(event) {
      const order = event.detail;
      if (!order?.id) return;
      setOrders((prev) => {
        if (prev.some((row) => row.id === order.id)) return prev;
        return [order, ...prev];
      });
    }

    function onOrderUpdated(event) {
      const order = event.detail;
      if (!order?.id) return;
      setOrders((prev) => prev.map((row) => (row.id === order.id ? { ...row, ...order } : row)));
    }

    window.addEventListener("dukaanlink-new-order", onNewOrder);
    window.addEventListener("dukaanlink-order-updated", onOrderUpdated);
    return () => {
      window.removeEventListener("dukaanlink-new-order", onNewOrder);
      window.removeEventListener("dukaanlink-order-updated", onOrderUpdated);
    };
  }, []);

  async function init() {
    const { data: userData } = await supabase.auth.getUser();
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, category")
      .eq("owner_id", userData.user.id)
      .maybeSingle();

    if (!business) {
      setLoading(false);
      return;
    }
    setBusinessId(business.id);
    setBusinessName(business.name || "");
    setBusinessCategory(business.category || "");
    await Promise.all([loadOrders(business.id), loadFlagged(business.id)]);
    setLoading(false);
  }

  async function loadOrders(bizId) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false });
    setOrders(data || []);
  }

  async function loadFlagged(bizId) {
    const { data, error } = await supabase
      .from("flagged_customers")
      .select("id, whatsapp_number, note")
      .eq("business_id", bizId);

    if (error) {
      setFlaggedByPhone({});
      return;
    }

    const map = {};
    for (const row of data || []) {
      const phone = toWhatsAppDigits(row.whatsapp_number);
      if (phone) map[phone] = row;
    }
    setFlaggedByPhone(map);
  }

  async function advanceStatus(order) {
    const next = getNextOrderStatus(order.status);
    if (!next) return;
    await supabase.from("orders").update({ status: next }).eq("id", order.id);
    setOrders((prev) =>
      prev.map((row) => (row.id === order.id ? { ...row, status: next } : row))
    );
  }

  async function confirmCancel() {
    if (!cancelTarget || cancelling) return;
    setCancelling(true);
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", cancelTarget.id);
    setOrders((prev) =>
      prev.map((row) =>
        row.id === cancelTarget.id ? { ...row, status: "cancelled" } : row
      )
    );
    setCancelling(false);
    setCancelTarget(null);
  }

  function openFlag(order) {
    const phone = toWhatsAppDigits(order.customer_whatsapp);
    if (!phone) return;
    const existing = flaggedByPhone[phone];
    setFlagTarget(order);
    setFlagNote(existing?.note || "");
    setFlagError("");
  }

  async function confirmFlag() {
    if (!flagTarget || !businessId || flagging) return;
    const phone = toWhatsAppDigits(flagTarget.customer_whatsapp);
    if (!phone) {
      setFlagError(t("orders.flagNeedNumber"));
      return;
    }

    setFlagging(true);
    setFlagError("");
    const payload = {
      business_id: businessId,
      whatsapp_number: phone,
      note: flagNote.trim() || null,
    };

    const { data, error } = await supabase
      .from("flagged_customers")
      .upsert(payload, { onConflict: "business_id,whatsapp_number" })
      .select("id, whatsapp_number, note")
      .maybeSingle();

    setFlagging(false);

    if (error) {
      if (/relation .*flagged_customers.* does not exist/i.test(error.message)) {
        setFlagError(t("orders.schemaMissingFlagged"));
      } else {
        setFlagError(error.message);
      }
      return;
    }

    if (data) {
      setFlaggedByPhone((prev) => ({ ...prev, [phone]: data }));
    } else {
      setFlaggedByPhone((prev) => ({
        ...prev,
        [phone]: { whatsapp_number: phone, note: payload.note },
      }));
    }
    setFlagTarget(null);
    setFlagNote("");
  }

  function onCustomerNumberSaved(orderId, number) {
    setOrders((prev) =>
      prev.map((row) => (row.id === orderId ? { ...row, customer_whatsapp: number } : row))
    );
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setOrderSoundEnabled(next);
    if (next) playOrderChime();
  }

  async function enableBrowserAlerts() {
    const result = await requestBrowserNotifications();
    setNotifyPerm(result);
    if (result === "granted") playOrderChime();
  }

  function statusLabel(status) {
    if (status === "preparing") return t("orders.preparing");
    if (status === "done") return t("orders.done");
    if (status === "cancelled") return t("orders.cancelled");
    return t("orders.new");
  }

  function markLabel(nextStatus) {
    if (nextStatus === "preparing") return t("orders.markPreparing");
    if (nextStatus === "done") return t("orders.markDone");
    return t("orders.markDone");
  }

  const repeatMap = useMemo(() => buildMonthlyRepeatMap(orders), [orders]);
  const rangedOrders = useMemo(
    () => filterOrdersByRange(orders, rangePreset, customDate),
    [orders, rangePreset, customDate]
  );
  const summary = useMemo(() => summarizeOrders(rangedOrders), [rangedOrders]);
  const todaySummary = useMemo(
    () => summarizeOrders(filterOrdersByRange(orders, "today")),
    [orders]
  );
  const tabCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const order of rangedOrders) {
      if (isActiveOrderStatus(order.status)) active += 1;
      else if (order.status === "done") completed += 1;
    }
    return { active, completed, all: rangedOrders.length };
  }, [rangedOrders]);
  const visibleOrders = useMemo(() => {
    if (statusTab === "active") {
      return rangedOrders.filter((o) => isActiveOrderStatus(o.status));
    }
    if (statusTab === "completed") {
      return rangedOrders.filter((o) => o.status === "done");
    }
    return rangedOrders;
  }, [rangedOrders, statusTab]);

  function shareTodaySummary() {
    const dateLabel = new Date().toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
    const message = buildDailySummaryMessage(
      {
        businessName: businessName || "DukaanLink",
        dateLabel,
        count: todaySummary.count,
        totalSales: todaySummary.totalSales,
        bestItem: todaySummary.bestItem,
      },
      locale
    );
    window.open(buildWhatsAppShareLink(message), "_blank", "noopener,noreferrer");
  }

  if (loading) return <AppSkeleton variant="orders" />;

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

  const activeInRange = tabCounts.active;
  const businessCopy = getBusinessCopy(businessCategory, locale);
  const needBrowserAlerts =
    notifyPerm !== "granted" && notifyPerm !== "unsupported" && notifyPerm !== "denied";

  return (
    <div className="page orders-page">
      <div className="orders-toolbar">
        <div className={`orders-live-pill ${activeInRange > 0 ? "hot" : ""}`}>
          <span className="orders-live-dot" />
          {activeInRange} {t("orders.active")}
        </div>
        <div className="orders-toolbar-right">
          <button
            type="button"
            className={`orders-sound-pill ${soundOn ? "on" : "off"}`}
            onClick={toggleSound}
            title={t("orders.chimeTitle")}
          >
            {soundOn ? <Volume2 size={15} strokeWidth={2.2} /> : <VolumeX size={15} strokeWidth={2.2} />}
            <span>{soundOn ? t("orders.soundOnShort") : t("orders.soundOffShort")}</span>
          </button>
          {needBrowserAlerts ? (
            <button type="button" className="orders-alert-link" onClick={enableBrowserAlerts}>
              <BellRing size={14} strokeWidth={2.2} />
              {t("orders.enableAlertsShort")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="orders-glance">
        <div className="orders-glance-top">
          <OrderDateFilter
            preset={rangePreset}
            customDate={customDate}
            rangeCount={summary.count}
            onChange={({ preset, customDate: nextDate }) => {
              setRangePreset(preset);
              if (nextDate) setCustomDate(nextDate);
            }}
          />
          <button type="button" className="orders-share-mini" onClick={shareTodaySummary}>
            <Share2 size={15} strokeWidth={2.2} />
            {t("orders.shareShort")}
          </button>
        </div>
        <div className="orders-glance-metrics">
          <div className="orders-metric">
            <ScrollText size={16} strokeWidth={2.1} />
            <div>
              <strong>{summary.count}</strong>
              <span>{t("orders.summaryOrders")}</span>
            </div>
          </div>
          <div className="orders-metric-divider" />
          <div className="orders-metric">
            <IndianRupee size={16} strokeWidth={2.1} />
            <div>
              <strong>₹{summary.totalSales}</strong>
              <span>{t("orders.summarySales")}</span>
            </div>
          </div>
          <div className="orders-metric-divider" />
          <div className="orders-metric best">
            <Flame size={16} strokeWidth={2.1} />
            <div>
              <strong className="truncate">
                {summary.bestItem
                  ? `${summary.bestItem.name} (${summary.bestItem.qty})`
                  : "—"}
              </strong>
              <span>{t("orders.summaryBest")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="orders-status-tabs" role="tablist" aria-label={businessCopy.orderListTitle}>
        {[
          { id: "active", label: t("orders.statusActive"), count: tabCounts.active },
          { id: "completed", label: t("orders.statusCompleted"), count: tabCounts.completed },
          { id: "all", label: t("orders.statusAll"), count: tabCounts.all },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={statusTab === tab.id}
            className={`orders-status-tab ${statusTab === tab.id ? "active" : ""}`}
            onClick={() => setStatusTab(tab.id)}
          >
            {tab.label}
            <i>{tab.count}</i>
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="empty-state">{t("orders.noOrders")}</p>
      ) : rangedOrders.length === 0 ? (
        <p className="empty-state">{t("orders.noOrdersInRange")}</p>
      ) : visibleOrders.length === 0 ? (
        <p className="empty-state">{t("orders.noOrdersInTab")}</p>
      ) : (
        visibleOrders.map((order) => {
          const status = order.status || "received";
          const done = status === "done";
          const cancelled = status === "cancelled";
          const active = isActiveOrderStatus(status);
          const nextStatus = getNextOrderStatus(status);
          const time = new Date(order.created_at);
          const phone = toWhatsAppDigits(order.customer_whatsapp);
          const flagged = phone ? flaggedByPhone[phone] : null;
          const repeat = repeatMap[phone];
          const customerLine =
            formatRepeatLabel(t, {
              name: order.customer_name || repeat?.name || "",
              count: repeat?.count || 0,
            }) ||
            (order.customer_name ? order.customer_name : "");

          return (
            <div
              className={`orders-card ${done ? "done" : ""} ${cancelled ? "cancelled" : ""}`}
              key={order.id}
            >
              <div className="orders-top">
                <div>
                  <div className="orders-status-row">
                    <span
                      className={`orders-badge ${
                        done ? "done" : cancelled ? "cancelled" : status === "preparing" ? "preparing" : ""
                      }`}
                    >
                      {statusLabel(status)}
                    </span>
                    {flagged ? (
                      <span className="orders-flagged-pill" title={flagged.note || undefined}>
                        {t("orders.flaggedPill")}
                      </span>
                    ) : null}
                  </div>
                  <div className="orders-customer-row">
                    {customerLine || phone ? (
                      <div className="orders-customer-line">
                        {customerLine || (phone ? `+${phone}` : "")}
                      </div>
                    ) : null}
                    {phone ? (
                      <button
                        type="button"
                        className={`orders-flag-btn ${flagged ? "active" : ""}`}
                        onClick={() => openFlag(order)}
                        aria-label={t("orders.flagNumber")}
                        title={t("orders.flagNumber")}
                      >
                        <Flag size={14} strokeWidth={2.2} fill={flagged ? "currentColor" : "none"} />
                      </button>
                    ) : null}
                  </div>
                  <div className="muted" style={{ marginTop: "0.35rem", fontSize: "0.8rem" }}>
                    {time.toLocaleString()}
                  </div>
                </div>
                <strong style={{ fontSize: "1.1rem" }}>₹{order.total}</strong>
              </div>

              <div className="orders-items-box">
                {(order.items || []).map((it, i) => (
                  <div key={i}>
                    <span>
                      {it.qty}× {it.name}
                    </span>
                    <span>₹{it.price * it.qty}</span>
                  </div>
                ))}
                {order.customer_note && (
                  <div style={{ marginTop: "0.4rem", color: "var(--muted)" }}>
                    Note: {order.customer_note}
                  </div>
                )}
              </div>

              <div className="orders-footer">
                <div>
                  <div className="eyebrow">
                    {cancelled
                      ? t("orders.cancelledBill")
                      : done
                        ? t("orders.paid")
                        : t("orders.totalBill")}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.15rem" }}>
                    ₹{order.total}
                  </div>
                </div>
                {active && nextStatus ? (
                  <div className="orders-actions">
                    <button
                      type="button"
                      className="primary-cta"
                      style={{ width: "auto" }}
                      onClick={() => advanceStatus(order)}
                    >
                      <CheckCircle2 size={18} strokeWidth={2.2} />
                      {markLabel(nextStatus)}
                    </button>
                    <button
                      type="button"
                      className="orders-cancel-link"
                      onClick={() => setCancelTarget(order)}
                    >
                      {t("orders.cancelOrder")}
                    </button>
                  </div>
                ) : done ? (
                  <div className="ghost-cta" style={{ width: "auto", paddingInline: "1rem" }}>
                    <CheckCircle2 size={18} strokeWidth={2.2} />
                    {t("orders.completed")}
                  </div>
                ) : null}
              </div>

              {active ? (
                <OrderQuickReplies
                  order={order}
                  businessCategory={businessCategory}
                  onNumberSaved={onCustomerNumberSaved}
                />
              ) : null}
            </div>
          );
        })
      )}

      {cancelTarget && (
        <div
          className="confirm-backdrop"
          onClick={() => !cancelling && setCancelTarget(null)}
          role="presentation"
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon danger">
              <XCircle size={26} strokeWidth={2.1} />
            </div>
            <h2 id="cancel-order-title">{t("orders.cancelTitle")}</h2>
            <p className="confirm-text">{t("orders.cancelText")}</p>
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost-cta"
                disabled={cancelling}
                onClick={() => setCancelTarget(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="danger-cta"
                disabled={cancelling}
                onClick={confirmCancel}
              >
                {cancelling ? t("orders.cancelling") : t("orders.cancelConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {flagTarget && (
        <div
          className="confirm-backdrop"
          onClick={() => !flagging && setFlagTarget(null)}
          role="presentation"
        >
          <div
            className="confirm-modal orders-flag-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flag-number-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon theme">
              <Flag size={26} strokeWidth={2.1} />
            </div>
            <h2 id="flag-number-title">{t("orders.flagTitle")}</h2>
            <p className="confirm-lead">
              +{toWhatsAppDigits(flagTarget.customer_whatsapp)}
            </p>
            <p className="confirm-text">{t("orders.flagText")}</p>
            <label className="orders-flag-note-label" htmlFor="flag-note">
              {t("orders.flagNoteLabel")}
            </label>
            <textarea
              id="flag-note"
              className="orders-flag-note"
              rows={2}
              maxLength={120}
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              placeholder={t("orders.flagNotePlaceholder")}
            />
            {flagError ? <p className="field-error">{flagError}</p> : null}
            <div className="confirm-actions">
              <button
                type="button"
                className="ghost-cta"
                disabled={flagging}
                onClick={() => setFlagTarget(null)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="primary-cta"
                disabled={flagging}
                onClick={confirmFlag}
              >
                <Flag size={16} strokeWidth={2.2} />
                {flagging ? t("orders.flagging") : t("orders.flagConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
