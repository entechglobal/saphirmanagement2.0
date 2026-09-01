import React, { useRef } from "react";
import { Upload, X } from "lucide-react";

export const ImageUploader = ({ image, onChange, onRemove, label, height = 180 }) => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onChange) onChange(file);
  };

  return (
    <div>
      {label && <p className="mb-1 font-semibold">{label}</p>}

      <div
        onClick={handleClick}
        style={{
          height,
          border: "1px dashed #cbd5e1",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {image ? (
          <>
            <img
              src={typeof image === "string" ? image : URL.createObjectURL(image)}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onRemove) onRemove();
              }}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.6)",
                borderRadius: "50%",
                padding: 4,
              }}
            >
              <X size={18} color="white" />
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#888" }}>
            <Upload size={32} />
            <p style={{ fontSize: 12, marginTop: 4 }}>Click to upload</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
