"use client";

import { Camera, ImagePlus, Store } from "lucide-react";

export default function ImageUploadField({
  id,
  label,
  hint,
  value,
  uploading,
  uploadLabel,
  uploadingLabel,
  variant = "logo",
  onUpload,
  disabled = false,
}) {
  return (
    <div className="field-row">
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.55rem" }}>
          {hint}
        </p>
      ) : null}
      <div className="photo-upload-row">
        <div className={`photo-upload-preview ${variant}`}>
          {value ? <img src={value} alt="" /> : variant === "logo" ? <Store size={28} strokeWidth={2} /> : <ImagePlus size={28} strokeWidth={2} />}
        </div>
        <div className="photo-upload-actions">
          <label htmlFor={id} className="secondary-cta" style={{ cursor: disabled ? "not-allowed" : "pointer" }}>
            <Camera size={18} strokeWidth={2.1} />
            {uploading ? uploadingLabel : uploadLabel}
          </label>
          <input
            id={id}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              onUpload(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}
