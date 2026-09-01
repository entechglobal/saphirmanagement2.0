import {
  PURCHASE_DOC_CONFIG,
  PurchaseDocumentsPage,
  PurchaseDocumentForm,
  PurchaseDocumentPreviewPage,
} from "../purchaseDocuments";

export const CommandesFournisseurPage = () => (
  <PurchaseDocumentsPage config={PURCHASE_DOC_CONFIG.commandeFournisseur} />
);

export const CommandeFournisseurForm = () => (
  <PurchaseDocumentForm config={PURCHASE_DOC_CONFIG.commandeFournisseur} />
);

export const CommandeFournisseurPreviewPage = () => (
  <PurchaseDocumentPreviewPage
    config={PURCHASE_DOC_CONFIG.commandeFournisseur}
  />
);
