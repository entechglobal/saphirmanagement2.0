import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import { ArrowLeft, ChevronLeft, Warehouse } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useCreateDepot, useUpdateDepot, useDepot } from "../hooks/useRepositories";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { DepotSchema } from "./repository.schema";
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { InputToggle } from "../../../shared/components/InputToggle";
import { useAuth } from "../../auth/hooks/useAuth";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";

export const RepositoryForm = () => {
    const { t } = useTranslation("repositories");
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const { user, isAuthenticated } = useAuth();
    // Fetch societes for dropdown
    const { data: societesData } = useSocietes({ pageIndex: 0, pageSize: 100 });
    const societes = societesData?.data || [];

    // Mutations
    const createMutation = useCreateDepot();
    const updateMutation = useUpdateDepot();
    const { data: depotData, isLoading } = useDepot(id);

    const {
        register,
        handleSubmit,
        control,
        reset,
        setValue,
        setError,
        watch,
        formState: { errors, dirtyFields },
    } = useForm({
        mode: "onTouched",
        resolver: zodResolver(DepotSchema),
        defaultValues: {
            societeId: "",
            code: "",
            name: "",
            address: "",
            city: "",
            region: "",
            phone: "",
            email: "",
            manager: "",
            type: "SECONDARY",
            surface: "",
            capacity: "",
            active: true,
        },
    });

    // Load data for edit
    useEffect(() => {
        if (!depotData?.data) return;

        const sanitized = Object.entries(depotData.data).reduce((acc, [key, value]) => {
            if (value === null || value === undefined) {
                acc[key] = "";
            } else if (key.endsWith("Id")) {
                acc[key] = String(value);
            } else {
                acc[key] = value;
            }
            return acc;
        }, {});

        reset(sanitized);
    }, [depotData, reset]);

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

    const onSubmit = (values) => {
        // SuperAdmin check (UI + safety)
        if (user?.isSuperAdmin && !values.societeId) {
            setError("societeId", {
                type: "manual",
                message: t("toast.select_company_error"),
            });
            return;
        }

        const mutation = isEditMode ? updateMutation : createMutation;

        let payloadValues = { ...values };

        // IMPORTANT PART
        if (!isEditMode && !user?.isSuperAdmin) {
            delete payloadValues.societeId;
        }

        const payload = isEditMode
            ? { id, payload: payloadValues }
            : payloadValues;

        mutation.mutate(payload, {
            onSuccess: (res) => {
                toast.success(res?.message || (isEditMode ? t("toast.update_success") : t("toast.create_success")));
                navigate("/depots");
            },
            onError: (err) => {
                mapAndSetErrors;
                const errorData = err?.response?.data;
                const errorMessage = errorData?.errors?.[0]?.msg || (isEditMode ? t("toast.update_error") : t("toast.create_error"));
                toast.error(errorMessage);
            },
        });
    };

    const typeOptions = [
        { label: t("primary"), value: "PRINCIPAL" },
        { label: t("secondary"), value: "SECONDARY" },
        { label: t("outlet"), value: "OUTLET" },
    ];

    if (isEditMode && isLoading) {
        return <SectionLoader text={t("form.loading")} />;
    }
    if (!depotData && isEditMode) {
        return (
            <NotFound
                onAction={() => navigate("/depots")}
            />
        );
    }

    return (
        <div className="-m-4 lg:-m-6 px-3 pt-3">
            {/* HEADER */}
            <FormPageHeader
                entityName={t("form.entity_name")}
                backPath="/depots"
                isEdit={isEditMode}
                data={depotData?.data}
                createTitle={t("form.create_title")}
                editTitle={t("form.edit_title")}
                    backLabel={t("form.back_label")}
            />

            {/* FORM */}
            <FormShell>
                <form
                    id="depot-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                >
                    <div className="grid grid-cols-12 gap-5">
                        {/* MAIN CONTENT COLUMN */}
                        <div className="col-span-12 lg:col-span-8 space-y-5">

                            {/* SECTION 1: IDENTITY */}
                            <FormCard title={t("form.general_information")}>
                                <FormFieldGrid>
                                    <div className="md:col-span-2">
                                        {user?.isSuperAdmin && !isEditMode && (
                                            <Controller
                                                control={control}
                                                name="societeId"
                                                render={({ field }) => (
                                                    <SelectDropDown
                                                        label={t("form.company_label")}
                                                        {...field}
                                                        options={societes.map((s) => ({
                                                            label: s.raisonSocial,
                                                            value: s.id,
                                                        }))}
                                                        error={errors.societeId?.message}
                                                        required
                                                        placeholder={t("form.select_company")}
                                                    />
                                                )}
                                            />
                                        )}
                                    </div>
                                    <Input
                                        label={t("form.depot_name_label")}
                                        {...register("name")}
                                        error={errors.name?.message}
                                        required
                                        placeholder={t("form.depot_name_placeholder")}
                                    />
                                    <Input
                                        label={t("form.phone_number_label")}
                                        {...register("phone")}
                                        error={errors.phone?.message}
                                        required
                                        placeholder={t("form.phone_number_placeholder")}
                                    />
                                    <div className="md:col-span-2">
                                        <Controller
                                            control={control}
                                            name="type"
                                            render={({ field }) => (
                                                <SelectDropDown
                                                    label={t("form.depot_type_label")}
                                                    {...field}
                                                    options={typeOptions}
                                                />
                                            )}
                                        />
                                    </div>
                                </FormFieldGrid>
                            </FormCard>

                            {/* SECTION 2: LOCATION & CONTACT */}
                            <FormCard title={t("form.location_contact")}>
                                <FormFieldGrid>
                                    <div className="md:col-span-2">
                                        <Input
                                            label={t("form.address_label")}
                                            {...register("address")}
                                            error={errors.address?.message}
                                            placeholder={t("form.address_placeholder")}
                                        />
                                    </div>
                                    <Input
                                        label={t("form.city_label")}
                                        {...register("city")}
                                        error={errors.city?.message}
                                        placeholder={t("form.city_placeholder")}
                                    />
                                    <Input
                                        label={t("form.region_label")}
                                        {...register("region")}
                                        error={errors.region?.message}
                                        placeholder={t("form.region_placeholder")}
                                    />
                                    <Input
                                        label={t("form.code_label")}
                                        {...register("code")}
                                        error={errors.code?.message}
                                        placeholder={t("form.code_placeholder")}
                                    />
                                    <Input
                                        label={t("form.email_label")}
                                        {...register("email")}
                                        error={errors.email?.message}
                                        placeholder={t("form.email_placeholder")}
                                    />
                                </FormFieldGrid>
                            </FormCard>
                        </div>

                        {/* SIDEBAR COLUMN */}
                        <div className="col-span-12 lg:col-span-4 space-y-5">
                            <FormCard title={t("form.operational_details")}>
                                <div className="space-y-4">
                                    <Input
                                        label={t("form.manager_label")}
                                        {...register("manager")}
                                        error={errors.manager?.message}
                                        placeholder={t("form.manager_placeholder")}
                                    />
                                    <Input
                                        label={t("form.surface_label")}
                                        {...register("surface")}
                                        error={errors.surface?.message}
                                        placeholder={t("form.surface_placeholder")}
                                    />
                                    <Input
                                        label={t("form.capacity_label")}
                                        {...register("capacity")}
                                        error={errors.capacity?.message}
                                        placeholder={t("form.capacity_placeholder")}
                                    />
                                    {isEditMode && (
                                        <div className="pt-4 border-t">
                                            <InputToggle
                                                label={t("form.status_label")}
                                                description={t("form.status_description")}
                                                checked={watch("active")}
                                                onChange={(e) =>
                                                    setValue("active", e.target.checked, { shouldDirty: true })
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                            </FormCard>
                        </div>
                    </div>
                    <FormActions
                        onCancel={() => navigate("/depots")}
                        cancelLabel={t("form.cancel")}
                        submitType="button"
                        onSubmit={handleSubmit(onSubmit)}
                        isLoading={createMutation.isPending || updateMutation.isPending}
                        submitLabel={
                            createMutation.isPending || updateMutation.isPending
                                ? t("form.processing")
                                : isEditMode
                                    ? t("form.update_button")
                                    : t("form.create_button")
                        }
                    />
                </form>
            </FormShell>
        </div>
    );
};