import { create } from "zustand";

/**
 * Global PDF preview — open before download/print.
 * Use openPdfPreview({ blob, filename, title }) from anywhere.
 */
export const usePdfPreviewStore = create((set) => ({
  open: false,
  blobUrl: null,
  filename: "document.pdf",
  title: "Aperçu PDF",
  openPreview: ({ blob, filename = "document.pdf", title = "Aperçu PDF" }) => {
    const blobUrl = window.URL.createObjectURL(
      blob instanceof Blob
        ? blob.type
          ? blob
          : new Blob([blob], { type: "application/pdf" })
        : new Blob([blob], { type: "application/pdf" }),
    );
    set((state) => {
      if (state.blobUrl) window.URL.revokeObjectURL(state.blobUrl);
      return {
        open: true,
        blobUrl,
        filename,
        title,
      };
    });
  },
  closePreview: () =>
    set((state) => {
      if (state.blobUrl) window.URL.revokeObjectURL(state.blobUrl);
      return { open: false, blobUrl: null };
    }),
}));

export const openPdfPreview = ({ blob, filename, title }) => {
  usePdfPreviewStore.getState().openPreview({ blob, filename, title });
};
