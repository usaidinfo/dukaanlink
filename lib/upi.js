export function normalizeUpiId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function isValidUpiId(value) {
  const upi = normalizeUpiId(value);
  // Basic VPA shape: local@handle (e.g. shop@oksbi, name@paytm)
  return /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/i.test(upi);
}

export function buildUpiPayLink({
  upiId,
  payeeName = "",
  amount,
  note = "",
}) {
  const pa = normalizeUpiId(upiId);
  if (!isValidUpiId(pa)) return "";

  const params = new URLSearchParams();
  params.set("pa", pa);
  if (payeeName) params.set("pn", payeeName);
  if (amount != null && Number(amount) > 0) {
    params.set("am", Number(amount).toFixed(2));
  }
  params.set("cu", "INR");
  if (note) params.set("tn", String(note).slice(0, 50));

  return `upi://pay?${params.toString()}`;
}

export async function downloadImage(url, filename = "payment-qr.png") {
  if (!url) return false;

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    // CORS / network fallback: open image so user can long-press save
    window.open(url, "_blank", "noopener,noreferrer");
    return false;
  }
}
