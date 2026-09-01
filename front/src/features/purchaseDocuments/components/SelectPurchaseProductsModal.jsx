import { SelectSalesProductsModal } from "../../salesDocuments/components/SelectSalesProductsModal";

/** Quantity-only product picker for purchase documents (no price grid). */
export const SelectPurchaseProductsModal = ({
  isOpen,
  onClose,
  onConfirm,
  alreadyInTable = [],
  useProducts,
  title = "Sélectionner des produits",
}) => (
  <SelectSalesProductsModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    alreadyInTable={alreadyInTable}
    hidePrices
    useProducts={useProducts}
    title={title}
  />
);
