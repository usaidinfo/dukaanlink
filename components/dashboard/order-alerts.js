"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, TriangleAlert, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  formatOrderNotifyBody,
  playOrderChime,
  showBrowserOrderNotification,
} from "../../lib/order-alerts";
import { crossedLowStockThreshold } from "../../lib/stock-alerts";
import { unitLabel } from "../../lib/quantity-units";
import { useI18n } from "../i18n-provider";
import "./order-alerts.css";


export default function OrderAlerts({ onBadgeChange }) {
  const { t } = useI18n();
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const businessIdRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const stockMapRef = useRef(new Map());
  const toastTimerRef = useRef(null);
  const onBadgeChangeRef = useRef(onBadgeChange);
  const tRef = useRef(t);
  const handleLowStockRef = useRef(null);

  onBadgeChangeRef.current = onBadgeChange;
  tRef.current = t;

  useEffect(() => {
    let channel = null;
    let stockChannel = null;
    let cancelled = false;
    const mountId = Math.random().toString(36).slice(2, 9);

    async function start() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user || cancelled) return;

        const { data: business } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", userData.user.id)
          .maybeSingle();

        if (!business?.id || cancelled) return;
        businessIdRef.current = business.id;

        try {
          const { data: menuRows, error: menuError } = await supabase
            .from("menu_items")
            .select("id, name, quantity, quantity_unit, alert_below, stock_tracking_enabled")
            .eq("business_id", business.id);
          if (!menuError) {
            (menuRows || []).forEach((row) => stockMapRef.current.set(row.id, row));
          }
        } catch {
          // older schemas without stock columns
        }

        const { data: recent } = await supabase
          .from("orders")
          .select("id")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(30);
        (recent || []).forEach((row) => seenIdsRef.current.add(row.id));

        async function refreshBadge() {
          try {
            const { count } = await supabase
              .from("orders")
              .select("*", { count: "exact", head: true })
              .eq("business_id", business.id)
              .not("status", "in", "(done,cancelled)");
            onBadgeChangeRef.current?.(count || 0);
          } catch {
            // badge refresh is best-effort
          }
        }

        function formatLowStockBody(item) {
          return String(tRef.current("menu.lowStockAlert") || "")
            .replace("{name}", item.name || "Item")
            .replace("{qty}", String(item.quantity ?? 0))
            .replace("{unit}", unitLabel(item.quantity_unit));
        }

        function handleLowStock(item) {
          if (!item?.id) return;
          playOrderChime();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([120, 60, 120]);
          }
          const body = formatLowStockBody(item);
          setToast({
            id: `stock-${item.id}-${item.quantity}`,
            title: tRef.current("orders.lowStockTitle"),
            body,
            href: "/dashboard/menu",
            kind: "stock",
          });
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setToast(null), 6500);
          showBrowserOrderNotification({
            title: tRef.current("orders.lowStockTitle"),
            body,
            orderId: `stock-${item.id}`,
            url: "/dashboard/menu",
          });
        }

        handleLowStockRef.current = handleLowStock;

        function handleNewOrder(order) {
          if (!order?.id || seenIdsRef.current.has(order.id)) return;
          seenIdsRef.current.add(order.id);

          playOrderChime();
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate([120, 60, 120]);
          }

          const body = formatOrderNotifyBody(order);
          setToast({
            id: order.id,
            title: tRef.current("orders.alertTitle"),
            body,
            total: order.total,
            href: "/dashboard/orders",
          });
          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
          toastTimerRef.current = window.setTimeout(() => setToast(null), 6500);

          showBrowserOrderNotification({
            title: tRef.current("orders.alertTitle"),
            body,
            orderId: order.id,
          });

          window.dispatchEvent(
            new CustomEvent("dukaanlink-new-order", { detail: order })
          );
          refreshBadge();
        }

        if (cancelled) return;

        // Unique name avoids "callbacks after subscribe()" when React remounts
        // and a previous channel with the same topic is still joining.
        const topic = `owner-orders-${business.id}-${mountId}`;
        const next = supabase.channel(topic);

        next
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "orders",
              filter: `business_id=eq.${business.id}`,
            },
            (payload) => handleNewOrder(payload.new)
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "orders",
              filter: `business_id=eq.${business.id}`,
            },
            (payload) => {
              window.dispatchEvent(
                new CustomEvent("dukaanlink-order-updated", { detail: payload.new })
              );
              refreshBadge();
            }
          );

        if (cancelled) {
          supabase.removeChannel(next).catch(() => {});
          return;
        }

        channel = next;
        next.subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Order alerts realtime:", status);
          }
        });

        const stockTopic = `owner-stock-${business.id}-${mountId}`;
        const stockNext = supabase.channel(stockTopic);
        stockNext.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "menu_items",
            filter: `business_id=eq.${business.id}`,
          },
          (payload) => {
            const nextRow = payload.new;
            if (!nextRow?.id) return;
            const prev = stockMapRef.current.get(nextRow.id);
            if (crossedLowStockThreshold(prev, nextRow)) {
              handleLowStock(nextRow);
            }
            stockMapRef.current.set(nextRow.id, nextRow);
          }
        );
        stockChannel = stockNext;
        stockNext.subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("Stock alerts realtime:", status);
          }
        });

        await refreshBadge();
      } catch (err) {
        // Soft failure — dashboard works without live chimes
        console.warn("Order alerts realtime unavailable:", err?.message || err);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
      }
      if (stockChannel) {
        supabase.removeChannel(stockChannel).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    function onLowStock(event) {
      const item = event.detail;
      if (!item?.id) return;
      if (businessIdRef.current && item.business_id && item.business_id !== businessIdRef.current) {
        return;
      }
      const prev = stockMapRef.current.get(item.id);
      if (crossedLowStockThreshold(prev, item)) {
        handleLowStockRef.current?.(item);
      }
      stockMapRef.current.set(item.id, item);
    }

    window.addEventListener("dukaanlink-low-stock", onLowStock);
    return () => window.removeEventListener("dukaanlink-low-stock", onLowStock);
  }, []);

  // Unlock audio on first user tap (mobile browsers block autoplay until then)
  useEffect(() => {
    function unlock() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        ctx.resume().finally(() => ctx.close().catch(() => {}));
      } catch {
        // ignore
      }
      window.removeEventListener("pointerdown", unlock);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  if (!toast) return null;

  return (
    <div className="order-toast" role="status" aria-live="polite">
      <div className={`order-toast-icon ${toast.kind === "stock" ? "warn" : ""}`}>
        {toast.kind === "stock" ? (
          <TriangleAlert size={18} strokeWidth={2.2} />
        ) : (
          <BellRing size={18} strokeWidth={2.2} />
        )}
      </div>
      <button
        type="button"
        className="order-toast-copy"
        onClick={() => {
          setToast(null);
          router.push(toast.href || "/dashboard/orders");
        }}
      >
        <strong>{toast.title}</strong>
        <span className={toast.kind === "stock" ? "wrap" : undefined}>{toast.body}</span>
      </button>
      <button
        type="button"
        className="order-toast-close"
        onClick={() => setToast(null)}
        aria-label={t("common.cancel")}
      >
        <X size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}
