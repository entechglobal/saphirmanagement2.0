import React, { useState, useEffect } from "react";
import { ArrowLeft, Upload, X, Layers, QrCode } from "lucide-react";
import { useCreateArticle, useUpdateArticle } from "../../../hooks/useArticles";
import { useFamilies } from "../../../hooks/useFamilies";
import { useUnits } from "../../../hooks/useUnits";
import { toast } from "@/shared/utils/toast";
import { useNavigate, Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { ImageUpload } from "../../../../../shared/components/ImageUpload";
import { Input } from "../../../../../shared/components/Input";
import { SelectDropDown as Select } from "../../../../../shared/components/SelectDropDown"
import { FormButton } from "../../../../../shared/FormButton";
import { generateBarcode } from "../../../../utils/barcodeUtils";
import { useTranslation } from "react-i18next";
import { formatUnitOption } from "../../../../../shared/utils/units";
import { FormDatePicker } from "../../../../../shared/FormDatePicker";
import { SectionLoader } from "../../../../../shared/components/loadersCollections/SectionLoader";
import { FormCard } from "../../../../../shared/components/FormCard";
import { FormActions } from "../../../../../shared/components/FormActions";
import { SelectWithQuickAdd } from "../../../components/SelectWithQuickAdd";
import { QuickCreateFamilyModal } from "../../../components/QuickCreateFamilyModal";
const BRAND_COLOR = "#C86AAC";

export const ParentArticleForm = ({
  id,
  initialValues,
  mode = "create",
  variants,
  OnBack,
  onCreateAndContinue,
  returnTo,
  onDirtyChange,
}) => {
  const { t } = useTranslation("articles");
  const { t: tCommon } = useTranslation("common");
  const data = initialValues?.data;
  const navigate = useNavigate();
  const { data: familiesData, isLoading } = useFamilies({ pageSize: 1000 });
  const { data: unitsData } = useUnits();
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const families = familiesData?.data ?? [];
  const units = unitsData?.data ?? [];

  const isEditMode = mode === "edit" && id;
  const [showFamilyModal, setShowFamilyModal] = useState(false);

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    familyId: "",
    unitePrincipaleId: "",
    uniteSecondaireId: "",
    uniteComplementaireId: "",
    conversionSecondaire: "",
    conversionComplementaire: "",
    prixAchat: "",
    prixVente1: "",
    prixVente2: "",
    prixVente3: "",
    commission: "",
    gereEnStock: true,
    visible: true,
    image: null,
    dateExpiration: "",
    dureeExpiration: "",
    remise: "0",
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [showSecondaryUnit, setShowSecondaryUnit] = useState(false);
  const [showComplementaryUnit, setShowComplementaryUnit] = useState(false);

  const isDirty = !!(formData.name || formData.barcode || formData.prixAchat || formData.prixVente1);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (units.length === 0) return;
    const piece = units.find((u) =>
      u.name?.toLowerCase().includes("pièce") ||
      u.name?.toLowerCase().includes("piece") ||
      u.symbol?.toLowerCase() === "pce" ||
      u.symbol?.toLowerCase() === "pcs"
    );
    if (piece) setFormData((prev) => prev.unitePrincipaleId ? prev : { ...prev, unitePrincipaleId: piece.id });
  }, [units]);

  const unitOptions = units.map((u) => ({
    value: u.id,
    label: formatUnitOption(u, tCommon),
  }));
  const familyOptions = families.map((f) => ({
    value: f.id,
    label: f.name,
  }));

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "number" && value !== "") {
      const numValue = parseFloat(value);
      if (numValue < 0) return;
      if (name === "remise" && numValue > 100) return;
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleGenerateBarcode = () => {
    setFormData((prev) => ({ ...prev, barcode: generateBarcode() }));
    if (errors.barcode) setErrors((prev) => ({ ...prev, barcode: "" }));
  };


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData((prev) => ({ ...prev, image: file }));
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: null }));
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name.trim()) e.name = t("form.required");
    if (!formData.barcode.trim()) e.barcode = t("form.required");
    if (!formData.familyId) e.familyId = t("form.required");
    if (!formData.unitePrincipaleId) e.unitePrincipaleId = t("form.required");
    if (!formData.prixAchat) e.prixAchat = t("form.required");
    if (!formData.prixVente1) e.prixVente1 = t("form.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return toast.error(t("toast.required_fields"));

    const finalFormData = {
      ...formData,
      prixVente2: formData.prixVente2 || formData.prixVente1,
      prixVente3: formData.prixVente3 || formData.prixVente1,
    };

    const fd = new FormData();
    Object.entries(finalFormData).forEach(([k, v]) => {
      if (v !== null && v !== "") {
        if (k === "image" && typeof v === "string") return;
        fd.append(k, v);
      }
    });
    fd.set("familyId", Number(formData.familyId));
    fd.set("unitePrincipaleId", Number(formData.unitePrincipaleId));
    fd.set("remise", Math.max(0, Number(formData.remise || 0)) / 100);

    try {

      const createdArticle = await createMutation.mutateAsync(fd);
      sessionStorage.setItem(`wizard_article_${createdArticle.data.id}`, "true");
      toast.success(t("toast.create_success"));
      onDirtyChange?.(false);
      if (returnTo) {
        navigate(
          `/articles/create/variants?parentId=${createdArticle.data.id}&returnTo=${encodeURIComponent(returnTo)}`
        );
        return;
      }
      navigate(`/articles/create/variants?parentId=${createdArticle.data.id}`);


    } catch (err) {
      const msg = err?.response?.data?.message;
      toast.error(msg || t("toast.create_error"));
    }
  };

  const mutation = isEditMode ? updateMutation : createMutation;

  if (isLoading)
    return (
      <SectionLoader />
    );

  return (
    <>
    <div>


      <div className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col lg:grid lg:grid-cols-12 gap-4"
        >
          {/* Main Column */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <FormCard title={t("form.identification")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <Input
                  label={t("form.fields.name")}
                  name="name"
                  placeholder={t("form.placeholders.product_name")}
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  required
                />


                {/* Barcode */}
                <div className="flex flex-col gap-1">
                  {/* 1. The Label stays on top of everything */}
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                    {t("form.fields.barcode")} <span className="text-red-500">*</span>
                  </label>

                  {/* 2. This container holds the Input + Button and handles the error layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-2">
                    <div className="flex-1">
                      <Input
                        /* Remove the internal label from the Input component if possible, 
                           or pass an empty string if it's baked in */
                        label=""
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        error={errors.barcode}
                        required
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="
                                          h-[42px] px-4 
                                          inline-flex items-center justify-center gap-2
                                          text-sm font-medium rounded-md border border-slate-300 bg-slate-50 text-slate-700
                                          hover:bg-slate-100 transition whitespace-nowrap
                                          w-full sm:w-auto
                                        "
                    >
                      <QrCode size={16} />
                      {t("form.buttons.generate")}
                    </button>
                  </div>
                </div>

                <SelectWithQuickAdd
                  label={t("form.fields.family")}
                  name="familyId"
                  value={formData.familyId}
                  onChange={handleInputChange}
                  error={errors.familyId}
                  options={familyOptions}
                  required
                  placeholder={t("form.placeholders.select")}
                  onAdd={() => setShowFamilyModal(true)}
                  addLabel={t("form.buttons.add_family")}
                />

                {/* Main Unit */}
                <Select
                  label={t("form.fields.unit_main")}
                  name="unitePrincipaleId"
                  value={formData.unitePrincipaleId}
                  onChange={handleInputChange}
                  error={errors.unitePrincipaleId}
                  options={unitOptions}
                  required
                  title={t("form.placeholders.select")}
                />

                {/* Secondary Unit */}
                <div className="md:col-span-2">
                  {!showSecondaryUnit ? (
                    <button
                      type="button"
                      onClick={() => setShowSecondaryUnit(true)}
                      className="text-sm font-semibold text-[#C86AAC] hover:underline"
                    >
                      {t("form.buttons.add_secondary")}
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label={t("form.fields.unit_secondary")}
                        name="uniteSecondaireId"
                        value={formData.uniteSecondaireId}
                        onChange={handleInputChange}
                        options={unitOptions}
                        title={t("form.placeholders.select")}
                      />
                      <Input
                        label={t("form.fields.conversion_secondary")}
                        type="number"
                        name="conversionSecondaire"
                        placeholder={t("form.placeholders.conversion_secondary")}
                        value={formData.conversionSecondaire}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>

                {/* Complementary Unit */}
                <div className="md:col-span-2">
                  {!showComplementaryUnit ? (
                    <button
                      type="button"
                      onClick={() => setShowComplementaryUnit(true)}
                      className="text-sm font-semibold text-[#C86AAC] hover:underline"
                    >
                      {t("form.buttons.add_complementary")}
                    </button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Select
                        label={t("form.fields.unit_complementary")}
                        title={t("form.placeholders.select")}
                        name="uniteComplementaireId"
                        value={formData.uniteComplementaireId}
                        onChange={handleInputChange}
                        options={unitOptions}
                      />
                      <Input
                        label={t("form.fields.conversion_complementary")}
                        type="number"
                        name="conversionComplementaire"
                        placeholder={t("form.placeholders.conversion_complementary")}
                        value={formData.conversionComplementaire}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            </FormCard>

            <FormCard title={t("form.pricing")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <Input
                  label={t("form.fields.purchase_price")}
                  type="number"
                  name="prixAchat"
                  placeholder={t("form.fields.purchase_price")}
                  value={formData.prixAchat}
                  onChange={handleInputChange}
                  error={errors.prixAchat}
                  required
                />
                <Input
                  label={t("form.fields.sale_price_1")}
                  type="number"
                  name="prixVente1"
                  placeholder={t("form.fields.sale_price_1")}
                  value={formData.prixVente1}
                  onChange={handleInputChange}
                  error={errors.prixVente1}
                  required
                />
                <Input
                  label={t("form.fields.discount_percent")}
                  name="remise"
                  type="number"
                  value={formData.remise}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-slate-100 dark:border-[#2e2e2e]">
                <Input
                  label={t("form.fields.sale_price_2")}
                  type="number"
                  name="prixVente2"
                  placeholder={t("form.fields.sale_price_2")}
                  value={formData.prixVente2}
                  onChange={handleInputChange}
                />
                <Input
                  label={t("form.fields.sale_price_3")}
                  type="number"
                  name="prixVente3"
                  placeholder={t("form.fields.sale_price_3")}
                  value={formData.prixVente3}
                  onChange={handleInputChange}
                />
                <Input
                  label={t("form.fields.commission")}
                  type="number"
                  name="commission"
                  placeholder={t("form.fields.commission")}
                  value={formData.commission}
                  onChange={handleInputChange}
                />
              </div>
            </FormCard>

            <FormCard title={t("form.stock_control")}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">


                <FormDatePicker
                  label={t("form.fields.expiration_date")}
                  name="dateExpiration"
                  value={formData.dateExpiration}
                  onChange={handleInputChange}
                  error={errors.dateExpiration}
                />
                <Input
                  label={t("form.fields.expiration_alert")}
                  type="number"
                  name="dureeExpiration"
                  value={formData.dureeExpiration}
                  onChange={handleInputChange}
                  placeholder={t("form.placeholders.days")}
                />
              </div>
            </FormCard>
          </div>

          {/* Sidebar Column */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <FormCard title={t("form.image_card")}>
              <ImageUpload
                imagePreview={imagePreview}
                onImageChange={handleImageChange}
                onRemove={handleRemoveImage}
                label={t("upload_image")}
              />
            </FormCard>

            <StatusSettings
              formData={formData}
              handleInputChange={handleInputChange}
              t={t}
            />
          </div>

          <div className="col-span-12">
            <FormActions
              onCancel={() => navigate(returnTo || "/articles")}
              cancelLabel={t("form.buttons.back")}
              submitLabel={mutation.isPending ? t("form.buttons.saving") : t("form.buttons.save_new")}
              isLoading={mutation.isPending}
            />
          </div>
        </form>
      </div>
    </div>

    <QuickCreateFamilyModal
      isOpen={showFamilyModal}
      onClose={() => setShowFamilyModal(false)}
      onCreated={(id) => {
        if (id) {
          setFormData((prev) => ({ ...prev, familyId: String(id) }));
          setErrors((prev) => ({ ...prev, familyId: null }));
        }
      }}
    />
    </>
  );
};

/* --- Sub-Components --- */



const StatusSettings = ({ formData, handleInputChange, t }) => (
  <FormCard title={t("form.status_card")}>
    <div className="space-y-3">
      <Toggle
        label={t("form.fields.manage_stock")}
        description={t("form.fields.manage_stock_desc")}
        name="gereEnStock"
        checked={formData.gereEnStock}
        onChange={handleInputChange}
      />
      <hr className="border-slate-100 dark:border-[#2e2e2e]" />
      <Toggle
        label={t("form.fields.visible")}
        description={t("form.fields.visible_desc")}
        name="visible"
        checked={formData.visible}
        onChange={handleInputChange}
      />
    </div>
  </FormCard>
);

const Toggle = ({ label, description, name, checked, onChange }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <div className="flex flex-col pr-4">
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {label}
      </span>
      <span className="text-[11px] text-slate-500">{description}</span>
    </div>
    <div className="relative flex items-center shrink-0">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-200 dark:bg-[#222222] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C86AAC] shadow-inner"></div>
    </div>
  </label>
);
