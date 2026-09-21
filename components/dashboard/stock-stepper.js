"use client";

import { Minus, Plus } from "lucide-react";
import { formatItemQuantity } from "../../lib/quantity-units";

export default function StockStepper({ item, saving, onBump }) {
  const label = formatItemQuantity(item) || `0 ${item.quantity_unit || "piece"}`;

  return (
    <div className="stock-stepper">
      <button
        type="button"
        className="stock-step-btn"
        disabled={saving}
        onClick={() => onBump(item, -1)}
        aria-label="Decrease stock"
      >
        <Minus size={16} strokeWidth={2.4} />
      </button>
      <span className="stock-step-value">{label}</span>
      <button
        type="button"
        className="stock-step-btn"
        disabled={saving}
        onClick={() => onBump(item, 1)}
        aria-label="Increase stock"
      >
        <Plus size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}
