import {
  SALES_DOC_CONFIG,
  SalesDocumentsPage,
  SalesDocumentForm,
  SalesDocumentPreviewPage,
} from "../salesDocuments";

export const DevisPage = () => (
  <SalesDocumentsPage config={SALES_DOC_CONFIG.devis} />
);

export const DevisForm = () => (
  <SalesDocumentForm config={SALES_DOC_CONFIG.devis} />
);

export const DevisPreviewPage = () => (
  <SalesDocumentPreviewPage config={SALES_DOC_CONFIG.devis} />
);
