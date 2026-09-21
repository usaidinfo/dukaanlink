"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
  formatOrderNotifyBody,
  playOrderChime,
  showBrowserOrderNotification,
} from "../../lib/order-alerts";
import { useI18n } from "../i18n-provider";
import "./order-alerts.css";


export default function OrderAlerts({ onBadgeChange }) {
  const { t } = useI18n();
  const router = useRouter();
  const [toast, setToast] = useState(null);
  const businessIdRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const toastTimerRef = useRef(null);
  const onBadgeChangeRef = useRef(onBadgeChange);
  const tRef = useRef(t);

  onBadgeChangeRef.current = onBadgeChange;
  tRef.current = t;

  useEffect(() => {
    let channel = null;
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
    };
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
      <div className="order-toast-icon">
        <BellRing size={18} strokeWidth={2.2} />
      </div>
      <button
        type="button"
        className="order-toast-copy"
        onClick={() => {
          setToast(null);
          router.push("/dashboard/orders");
        }}
      >
        <strong>{toast.title}</strong>
        <span>{toast.body}</span>
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
