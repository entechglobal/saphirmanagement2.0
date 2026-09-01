import {
  SALES_DOC_CONFIG,
  SalesDocumentsPage,
  SalesDocumentForm,
  SalesDocumentPreviewPage,
} from "../salesDocuments";

export const CommandesPage = () => (
  <SalesDocumentsPage config={SALES_DOC_CONFIG.commande} />
);

export const CommandeForm = () => (
  <SalesDocumentForm config={SALES_DOC_CONFIG.commande} />
);

export const CommandePreviewPage = () => (
  <SalesDocumentPreviewPage config={SALES_DOC_CONFIG.commande} />
);
