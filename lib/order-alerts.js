const SOUND_KEY = "dukaanlink-order-sound";
const NOTIFY_PROMPTED_KEY = "dukaanlink-notify-prompted";

export function isOrderSoundEnabled() {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(SOUND_KEY);
  return saved !== "off";
}

export function setOrderSoundEnabled(enabled) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
}

export function wasNotifyPrompted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFY_PROMPTED_KEY) === "1";
}

export function markNotifyPrompted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFY_PROMPTED_KEY, "1");
}

/** Short kitchen-style chime via Web Audio (no mp3 asset needed). */
export function playOrderChime() {
  if (typeof window === "undefined" || !isOrderSoundEnabled()) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    function tone(freq, start, duration, gain = 0.08) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(0.0001, now + start);
      amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    }

    tone(880, 0, 0.16, 0.09);
    tone(1175, 0.14, 0.22, 0.08);

    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore autoplay / unsupported audio errors
  }
}

export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestBrowserNotifications() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  markNotifyPrompted();
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

export function showBrowserOrderNotification({ title, body, orderId }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    const notification = new Notification(title, {
      body,
      tag: orderId ? `dukaanlink-order-${orderId}` : "dukaanlink-new-order",
      renotify: true,
      requireInteraction: false,
    });

    notification.onclick = () => {
      window.focus();
      if (window.location.pathname !== "/dashboard/orders") {
        window.location.href = "/dashboard/orders";
      }
      notification.close();
    };
  } catch {
    // Some browsers throw if called without a gesture after a long idle
  }
}

export function formatOrderNotifyBody(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const summary = items
    .slice(0, 3)
    .map((item) => `${item.qty}× ${item.name}`)
    .join(", ");
  const extra = items.length > 3 ? ` +${items.length - 3}` : "";
  const total = order?.total != null ? `₹${order.total}` : "";
  if (summary && total) return `${summary}${extra} · ${total}`;
  if (total) return total;
  return summary || "New order received";
}
