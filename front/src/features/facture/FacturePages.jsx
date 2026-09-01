import {
  SALES_DOC_CONFIG,
  SalesDocumentsPage,
  SalesDocumentForm,
  SalesDocumentPreviewPage,
} from "../salesDocuments";

export const FacturesPage = () => (
  <SalesDocumentsPage config={SALES_DOC_CONFIG.facture} />
);

export const FactureForm = () => (
  <SalesDocumentForm config={SALES_DOC_CONFIG.facture} />
);

export const FacturePreviewPage = () => (
  <SalesDocumentPreviewPage config={SALES_DOC_CONFIG.facture} />
);
