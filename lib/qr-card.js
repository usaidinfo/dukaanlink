/**
 * Builds a printable/shareable QR standee card as a PNG blob.
 * Includes business name, catalog heading, QR, and powered-by footer.
 */
export function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let line = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${line} ${words[i]}`;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

export function buildQrCardCanvas({
  qrCanvas,
  businessName,
  heading,
  poweredBy = "Powered by DukaanLink",
}) {
  if (!qrCanvas) return null;

  const width = 720;
  const height = 980;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Card background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Soft outer frame
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Top brand bar
  ctx.fillStyle = "#00685d";
  ctx.fillRect(18, 18, width - 36, 18);

  // Accent ribbon under bar
  ctx.fillStyle = "#fe932c";
  ctx.fillRect(18, 36, width - 36, 7);

  // Business name — compact so QR can dominate
  ctx.fillStyle = "#0f172a";
  ctx.font = "800 40px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.textAlign = "center";
  const nameLines = wrapText(ctx, businessName || "My Shop", width - 80).slice(0, 2);
  let y = 100;
  nameLines.forEach((line) => {
    ctx.fillText(line, width / 2, y);
    y += 46;
  });

  // Heading (Menu / Catalog / Services)
  ctx.fillStyle = "#00685d";
  ctx.font = "700 24px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText(heading || "Scan to order", width / 2, y + 10);

  // QR frame — fill most of the remaining card
  const qrSize = 560;
  const qrPad = 10;
  const framePad = 12;
  const qrX = (width - qrSize) / 2;
  const qrY = y + 58;
  ctx.fillStyle = "#f8fafc";
  roundRect(ctx, qrX - framePad, qrY - framePad, qrSize + framePad * 2, qrSize + framePad * 2, 24);
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  roundRect(ctx, qrX - framePad, qrY - framePad, qrSize + framePad * 2, qrSize + framePad * 2, 24);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qrX, qrY, qrSize, qrSize, 16);
  ctx.fill();

  ctx.drawImage(qrCanvas, qrX + qrPad, qrY + qrPad, qrSize - qrPad * 2, qrSize - qrPad * 2);

  // Footer — tight under QR
  ctx.fillStyle = "#64748b";
  ctx.font = "600 18px 'Plus Jakarta Sans', Arial, sans-serif";
  ctx.fillText(poweredBy, width / 2, height - 58);

  // Bottom brand strip
  ctx.fillStyle = "#00685d";
  ctx.fillRect(18, height - 40, width - 36, 22);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function canvasToBlob(canvas, type = "image/png", quality = 0.95) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
