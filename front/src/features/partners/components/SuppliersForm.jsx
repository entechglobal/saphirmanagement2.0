import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    Truck,
    ChevronLeft,

} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

/* ---------- Hooks ----------- */
import {
    useCreateFournisseur,
    useUpdateFournisseur,
    useFournisseur,
} from "../hooks/useSuppliers";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";

/* ---------- Components ---------- */
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { InputToggle } from "../../../shared/components/InputToggle";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormPageHeader } from "../../../shared/components/FormPageHeader.jsx";
import { supplierSchema } from "./supplier.schema.js";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader.jsx";
import { NotFound } from "../../../shared/components/NotFound.jsx";

export const SuppliersForm = () => {
    const { t } = useTranslation("suppliers");
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const returnTo = searchParams.get("returnTo");
    const isEditMode = Boolean(id);

    const { user } = useAuth();
    const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 100 });
    const societes = societesData?.data || [];

    const createMutation = useCreateFournisseur();
    const updateMutation = useUpdateFournisseur();
    const { data: supplier, isLoading, isError } = useFournisseur(id, { enabled: isEditMode });

    // Memoize types to ensure they update on language change
    const SUPPLIER_TYPES = useMemo(() => [
        { label: t("types.particulier"), value: "PARTICULIER" },
        { label: t("types.societe"), value: "SOCIETE" },
    ], [t]);

    const methods = useForm({
        mode: "onTouched",
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: "",
            phone: "",
            email: "",
            type: "",
            address: "",
            region: "",
            website: "",
            ice: "",
            if: "",
            rc: "",
            tp: "",
            paymentDeadline: 0,
            active: true,
            societeId: "",
            bankAccount: "",
            bankName: "",
        },
    });

    const {
        register,
        control,
        handleSubmit,
        reset,
        setError,
        watch,
        formState: { errors },
    } = methods;
    const supplierType = watch("type");
    const isSociete = supplierType === "SOCIETE";

    useEffect(() => {
        if (supplier?.data) {
            const sanitizedData = Object.entries(supplier.data).reduce((acc, [key, value]) => {
                acc[key] = value === null ? "" : value;
                return acc;
            }, {});
            reset(sanitizedData);
        }
    }, [supplier, reset]);

    const mapAndSetErrors = (err) => {
        const apiErrors = err?.response?.data?.errors;
        if (Array.isArray(apiErrors)) {
            apiErrors.forEach((e) => {
                if (e.path) setError(e.path, { type: "server", message: e.msg });
            });
        } else if (typeof apiErrors === "object" && apiErrors !== null) {
            Object.entries(apiErrors).forEach(([field, msg]) => {
                setError(field, { type: "server", message: msg });
            });
        }
    };

    const onSubmit = (formData) => {
        if (user?.isSuperAdmin && !formData.societeId) {
            setError("societeId", {
                type: "manual",
                message: t("form.errors.select_company"),
            });
            return;
        }

        const mutation = isEditMode ? updateMutation.mutate : createMutation.mutate;
        let payloadValues = { ...formData };

        if (payloadValues.type !== "SOCIETE") {
            payloadValues = {
                ...payloadValues,
                ice: null,
                if: null,
                rc: null,
                tp: null,
            };
        }

        if (!isEditMode && !user?.isSuperAdmin) {
            delete payloadValues.societeId;
        }

        const payload = isEditMode ? { id, payload: payloadValues } : payloadValues;

        mutation(payload, {
            onSuccess: (res) => {
                toast.success(res?.message || (isEditMode ? t("form.success_update") : t("form.success_create")));
                navigate(!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/fournisseurs");
            },
            onError: (err) => mapAndSetErrors(err),
        });
    };

    if (isEditMode && isLoading) return (
      <SectionLoader />
    );
        if (isEditMode && (!supplier?.data || isError)) {
            return (
                <NotFound
                 
                    onAction={() => navigate("/fournisseurs")}
                />
            );
        } 

    return (
        <div className="-m-4 lg:-m-6 px-3 pt-3">
            <FormPageHeader
                entityName={t("form.entity_name")}
                backPath={!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/fournisseurs"}
                isEdit={isEditMode}
                data={supplier?.data}
                createTitle={t("form.create_title")}
                editTitle={t("form.edit_title")}
                backLabel={t("form.back")}
                editTitleKey="name"
            />

            <FormShell>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-12 gap-5">
                        {/* Left Column */}
                        <div className="col-span-12 lg:col-span-8 space-y-5">

                            {/* Section 1: Identification */}
                            <FormCard title={t("form.sections.identification")}>
                                <FormFieldGrid>
                                    <Input
                                        label={t("columns.name")}
                                        {...register("name")}
                                        error={errors.name?.message}
                                        placeholder={t("form.placeholders.name")}
                                        required
                                    />
                                    <Input
                                        label={t("columns.phone")}
                                        {...register("phone")}
                                        error={errors.phone?.message}
                                        placeholder="ex: 06 XX XX XX XX"
                                        required
                                    />

                                    {user?.isSuperAdmin && (
                                        <Controller
                                            control={control}
                                            name="societeId"
                                            render={({ field }) => (
                                                <SelectDropDown
                                                    label={t("import.societe_label")}
                                                    {...field}
                                                    options={societes.map((s) => ({ label: s.raisonSocial, value: s.id }))}
                                                    error={errors.societeId?.message}
                                                    required
                                                />
                                            )}
                                        />
                                    )}

                                    <SelectDropDown
                                        label={t("columns.type")}
                                        {...register("type")}
                                        options={SUPPLIER_TYPES}
                                        error={errors.type?.message}
                                    />
                                    <Input
                                        label={t("columns.email")}
                                        type="email"
                                        {...register("email")}
                                        error={errors.email?.message}
                                        placeholder="ex: fournisseur@gmail.com"
                                    />
                                    <Input
                                        label={t("columns.website")}
                                        {...register("website")}
                                        placeholder="https://..."
                                        error={errors.website?.message}
                                    />
                                    <Input
                                        label={t("columns.address")}
                                        {...register("address")}
                                        error={errors.address?.message}
                                        placeholder={t("form.placeholders.address")}
                                    />
                                    <Input
                                        label={t("columns.region")}
                                        {...register("region")}
                                        error={errors.region?.message}
                                        placeholder={t("form.placeholders.region")}
                                    />
                                </FormFieldGrid>
                            </FormCard>

                            {/* Section 2: Fiscal — companies only */}
                            {isSociete && (
                                <FormCard title={t("form.sections.fiscal")}>
                                    <FormFieldGrid>
                                        <Input label={t("columns.ice")} {...register("ice")} error={errors.ice?.message} maxLength={15} placeholder={t("form.placeholders.ice")} />
                                        <Input label={t("columns.if")} {...register("if")} error={errors.if?.message} placeholder={t("columns.if")} />
                                        <Input label={t("columns.rc")} {...register("rc")} error={errors.rc?.message} placeholder={t("columns.rc")} />
                                        <Input label={t("columns.tp")} {...register("tp")} error={errors.tp?.message} placeholder={t("columns.tp")} />
                                    </FormFieldGrid>
                                </FormCard>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="col-span-12 lg:col-span-4 space-y-5">
                            {/* Section 3: Banking */}
                            <FormCard title={t("form.sections.banking")}>
                                <div className="flex flex-col gap-y-5">
                                    <Input
                                        label={t("columns.bank")}
                                        {...register("bankName")}
                                        error={errors.bankName?.message}
                                        placeholder="ex: BMCI"
                                    />
                                    <Input
                                        label={t("columns.bankAccount")}
                                        {...register("bankAccount")}
                                        error={errors.bankAccount?.message}
                                        placeholder={t("form.placeholders.rib")}
                                    />
                                </div>
                            </FormCard>

                            <FormCard title={t("form.sections.settings")}>
                                <div className="space-y-5">
                                    <Input
                                        label={t("columns.paymentDeadline")}
                                        type="number"
                                        {...register("paymentDeadline", { valueAsNumber: true })}
                                        error={errors.paymentDeadline?.message}
                                    />
                                </div>
                            </FormCard>

                            <FormCard title={t("form.sections.status")}>
                                <Controller
                                    control={control}
                                    name="active"
                                    render={({ field }) => (
                                        <InputToggle
                                            label={t("form.active_account")}
                                            description={t("form.active_description")}
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
                                        />
                                    )}
                                />
                            </FormCard>
                        </div>
                    </div>


                    <FormActions
                        onCancel={() => navigate(!isEditMode && returnTo ? decodeURIComponent(returnTo) : "/fournisseurs")}
                        cancelLabel={t("import.cancel")}
                        submitType="button"
                        onSubmit={handleSubmit(onSubmit)}
                        isLoading={createMutation.isPending || updateMutation.isPending}
                        submitLabel={
                            createMutation.isPending || updateMutation.isPending
                                ? t("form.processing")
                                : isEditMode ? t("form.update_btn") : t("form.create_btn")
                        }
                    />
                </form>
            </FormShell>
        </div>
    );
};