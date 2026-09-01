import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    Building, ChevronLeft
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
    useCreateSociete,
    useUpdateSociete,
    useSociete,
} from "../hooks/useSocietes";
import { SocieteSchema } from "./societe.schema";
import { FormCard, FormFieldGrid, FormShell } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { Input } from "../../../shared/components/Input";
import { ImageUpload } from "../../../shared/components/ImageUpload";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";

export const SocietesForm = () => {
    const { t } = useTranslation("societes");
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    // Image state
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");
    const [logoDirty, setLogoDirty] = useState(false);

    // Fixed structure state (single key-value pair)
    const [fixedStructureKey, setFixedStructureKey] = useState("");
    const [fixedStructureValue, setFixedStructureValue] = useState("");
    const [fixedStructureDirty, setFixedStructureDirty] = useState(false);

    const createMutation = useCreateSociete();
    const updateMutation = useUpdateSociete();
    const {
        data: societeResponse,
        isLoading,
        isError,
        isSuccess,
    } = useSociete(id, {
        enabled: isEditMode,
    });
    const societe = societeResponse?.data;

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, dirtyFields },
    } = useForm({
        mode: "onTouched",
        resolver: zodResolver(SocieteSchema),
        defaultValues: {
            raisonSocial: "",
            address: "",
            tel: "",
            phone: "",
            email: "",
            siteWeb: "",
            ice: "",
            rc: "",
            tp: "",
            if: "",
        },
    });

    // Load data in edit mode
    useEffect(() => {
        if (!societe) return;

        const sanitized = Object.entries(societe).reduce((acc, [k, v]) => {
            acc[k] = v === null ? "" : v;
            return acc;
        }, {});

        reset(sanitized);

        // Set logo preview
        if (societe.logo) {
            setLogoPreview(societe.logo);
        }

        // Parse fixed structure
        if (societe.fixedStructure) {
            try {
                const parsed =
                    typeof societe.fixedStructure === "string"
                        ? JSON.parse(societe.fixedStructure)
                        : societe.fixedStructure;

                // Extract "tag" and "message" values
                if (parsed.tag !== undefined) {
                    setFixedStructureKey(parsed.tag);
                }
                if (parsed.message !== undefined) {
                    setFixedStructureValue(parsed.message);
                }
            } catch (error) {
                console.error("Failed to parse fixedStructure:", error);
            }
        }

        setLogoFile(null);
        setLogoDirty(false);
    }, [societe, reset]);

    // Image handlers
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoFile(file);
            setLogoPreview(reader.result);
            setLogoDirty(true);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setLogoFile(null);
        setLogoPreview("");
        setLogoDirty(true);
    };

    // Error mapper
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

    const onSubmit = async (values) => {
        const fd = new FormData();

        // 1. Append regular fields (excluding logo and fixedStructure)
        Object.keys(dirtyFields).forEach((key) => {
            if (key === "fixedStructure" || key === "logo") return;

            const value = values[key];

            if (value !== undefined && value !== null && value !== "") {
                fd.append(key, value);
            }
        });

        // 2. STRICT LOGO HANDLING
        if (logoDirty) {
            if (logoFile instanceof File) {
                fd.append("logo", logoFile);
            } else if (!logoPreview) {
                fd.append("logo", "");
            }
        }

        // 3. Fixed structure
        if (fixedStructureDirty) {
            if (fixedStructureKey.trim() || fixedStructureValue.trim()) {
                fd.append(
                    "fixedStructure",
                    JSON.stringify({
                        tag: fixedStructureKey.trim(),
                        message: fixedStructureValue.trim(),
                    })
                );
            } else {
                fd.append("fixedStructure", "");
            }
        }

        const mutation = isEditMode ? updateMutation : createMutation;
        const finalPayload = isEditMode ? { id, payload: fd } : fd;

        mutation.mutate(finalPayload, {
            onSuccess: (res) => {
                toast.success(res?.message || (isEditMode ? t("toast.update_success") : t("toast.create_success")));
                navigate("/societes");
            },
            onError: mapAndSetErrors,
        });
    };

    if (isEditMode && isLoading) {
        return <SectionLoader text={t("form.loading")} />;
    }

    if (isEditMode && (isError || (isSuccess && !societe))) {
        return (
            <NotFound
                onAction={() => navigate("/societes")}
            />
        );
    }

    return (
        <div className="-m-4 lg:-m-6 px-3 pt-3">
            {/* HEADER */}
            <FormPageHeader
                entityName={t("form.entity_name")}
                backPath="/societes"
                isEdit={isEditMode}
                data={societe}
                createTitle={t("form.create_title")}
                editTitle={t("form.edit_title")}
                editTitleKey="raisonSocial"
                backLabel={t("form.back_label")}
            />

            {/* FORM */}
            <FormShell>
                <form
                    id="societe-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-5"
                >
                    <div className="grid grid-cols-12 gap-5">

                        {/* LEFT COLUMN: Main Information (8/12) */}
                        <div className="col-span-12 lg:col-span-8 space-y-5">

                            {/* IDENTIFICATION */}
                            <FormCard title={t("form.identification")}>
                                <FormFieldGrid>
                                    <Input
                                        label={t("form.company_name_label")}
                                        {...register("raisonSocial")}
                                        error={errors.raisonSocial?.message}
                                        required
                                        placeholder={t("form.company_name_placeholder")}
                                    />
                                    <Input
                                        label={t("form.phone_label")}
                                        {...register("phone")}
                                        error={errors.phone?.message}
                                        required
                                        placeholder={t("form.phone_placeholder")}
                                    />
                                    <Input
                                        label={t("form.email_label")}
                                        type="email"
                                        {...register("email")}
                                        error={errors.email?.message}
                                        placeholder={t("form.email_placeholder")}
                                    />
                                    <Input
                                        label={t("form.website_label")}
                                        {...register("siteWeb")}
                                        error={errors.siteWeb?.message}
                                        placeholder={t("form.website_placeholder")}
                                    />
                                    <Input
                                        label={t("form.address_label")}
                                        {...register("address")}
                                        error={errors.address?.message}
                                        className="md:col-span-2"
                                        placeholder={t("form.address_placeholder")}
                                    />
                                </FormFieldGrid>
                            </FormCard>

                            {/* FISCAL INFO */}
                            <FormCard title={t("form.fiscal_info")}>
                                <FormFieldGrid>
                                    <Input
                                        label={t("form.ice_label")}
                                        {...register("ice")}
                                        error={errors.ice?.message}
                                        placeholder={t("form.ice_placeholder")}
                                        maxLength={15}
                                    />
                                    <Input
                                        label={t("form.if_label")}
                                        {...register("if")}
                                        error={errors.if?.message}
                                    />
                                    <Input
                                        label={t("form.rc_label")}
                                        {...register("rc")}
                                        error={errors.rc?.message}
                                    />
                                    <Input
                                        label={t("form.tp_label")}
                                        {...register("tp")}
                                        error={errors.tp?.message}
                                    />
                                </FormFieldGrid>
                            </FormCard>
                        </div>

                        {/* RIGHT COLUMN: Media & Meta (4/12) */}
                        <div className="col-span-12 lg:col-span-4 space-y-5">

                            {/* LOGO UPLOAD */}
                            <FormCard title={t("form.company_logo")}>
                                <div className="flex justify-center p-2">
                                    <ImageUpload
                                        imagePreview={logoPreview}
                                        onImageChange={handleImageUpload}
                                        onRemove={handleRemoveImage}
                                    />
                                </div>
                            </FormCard>

                            {/* FIXED STRUCTURE */}
                            <FormCard title={t("form.fixed_structure")}>
                                <div className="space-y-5">
                                    <Input
                                        label={t("form.tag_label")}
                                        value={fixedStructureKey}
                                        onChange={(e) => {
                                            setFixedStructureKey(e.target.value);
                                            setFixedStructureDirty(true);
                                        }}
                                        placeholder={t("form.tag_placeholder")}
                                    />
                                    <Input
                                        label={t("form.message_label")}
                                        value={fixedStructureValue}
                                        onChange={(e) => {
                                            setFixedStructureValue(e.target.value);
                                            setFixedStructureDirty(true);
                                        }}
                                        placeholder={t("form.message_placeholder")}
                                    />
                                </div>
                            </FormCard>

                        </div>
                    </div>

                    <FormActions
                        onCancel={() => navigate("/societes")}
                        cancelLabel={t("form.cancel")}
                        submitType="button"
                        onSubmit={handleSubmit(onSubmit)}
                        isLoading={createMutation.isPending || updateMutation.isPending}
                        submitLabel={
                            createMutation.isPending || updateMutation.isPending
                                ? t("form.saving")
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