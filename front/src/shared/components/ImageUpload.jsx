import React from 'react';
import { Upload, X } from 'lucide-react';

export const ImageUpload = ({ 
  imagePreview, 
  onImageChange, 
  onRemove, 
  label = "Upload Photo",
  maxWidth = "max-w-[280px]" 
}) => {
  return (
    <div className={`relative aspect-square w-full ${maxWidth} mx-auto lg:max-w-none rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors hover:border-[#B12B89]`}>
      {imagePreview ? (
        <>
          <img
            src={imagePreview}
            className="w-full h-full object-cover"
            alt="Preview"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-lg p-1.5 shadow-sm hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm mb-2 border border-slate-200 dark:border-slate-800">
            <Upload className="w-5 h-5 text-[#B12B89]" />
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </span>
          <span className="text-[10px] text-slate-400 mt-1 uppercase">
            JPEG, PNG up to 2MB
          </span>
          <input
            type="file"
            hidden
            onChange={onImageChange}
            accept="image/*"
          />
        </label>
      )}
    </div>
  );
};
