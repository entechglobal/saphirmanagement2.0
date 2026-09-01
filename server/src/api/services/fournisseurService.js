import { exportCSV, exportExcel, importCSV, importExcel } from "../utils/importExportUtils.js";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { formatDate, parseCSVDate } from "../utils/formatDates.js";
import { asText, fromText } from "../utils/csvHelpers.js";

// ============================================
// CREATE FOURNISSEUR
// ============================================
export const create = async (data, societeId) => {
  if (!societeId) {
    throw new ApiError("societeId is required", 404);
  }

  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }

  if (data.paymentDeadline && typeof data.paymentDeadline === "string") {
    data.paymentDeadline = parseInt(data.paymentDeadline);
  }

  if (data.type !== "SOCIETE") {
    data.ice = null;
    data.if = null;
    data.rc = null;
    data.tp = null;
  } else {
    for (const key of ["ice", "if", "rc", "tp"]) {
      if (data[key] === "" || data[key] === undefined) data[key] = null;
    }
  }

  return prisma.fournisseur.create({
    data: {
      ...data,
      societeId,
    },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
    },
  });
};

// ============================================
// GET ALL FOURNISSEURS
// ============================================
export const getAll = async (query, societeId = null) => {
  const where = {};

  if (societeId) {
    where.societeId = societeId;
  }

  if (query.keyword) {
    where.OR = [
      { name: { contains: query.keyword } },
      { phone: { contains: query.keyword } },
      { email: { contains: query.keyword } },
      { ice: { contains: query.keyword } },
    ];
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.active !== undefined) {
    where.active = query.active === "true";
  }

  const count = await prisma.fournisseur.count({ where });

  const apiFeatures = new ApiFeatures(query).filter().sort().paginate(count);

  const fournisseurs = await prisma.fournisseur.findMany({
    ...apiFeatures.build(),
    where,
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
    },
  });

  return {
    results: fournisseurs.length,
    pagination: apiFeatures.paginationResult,
    data: fournisseurs,
  };
};

// ============================================
// GET FOURNISSEUR BY ID
// ============================================
export const getById = async (id, requestingUser = null) => {
  const fournisseur = await prisma.fournisseur.findUnique({
    where: { id },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
      documents: {
        select: {
          id: true,
          documentNumber: true,
          // ✅ v6.0: FournisseurDocument has NO documentType and NO documentDate fields.
          //    Document type is implied by which specialized relation is populated
          //    (bonReception, bonRetourFournisseur, avoirFournisseur).
          //    documentDate lives on the specialized table (BonReception.documentDate, etc.).
          status: true,
          totalTTC: true,
          amountDue: true,
        },
        orderBy: {
          createdAt: "desc", // ✅ use createdAt on header — documentDate is on specialized table
        },
        take: 10,
      },
    },
  });

  if (!fournisseur) {
    throw new ApiError("Fournisseur not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== fournisseur.societeId) {
      throw new ApiError(
        "Access denied. This fournisseur belongs to another société.",
        403,
      );
    }
  }

  // ✅ v6.0: Filter goods receipts (purchase invoices) via the bonReception relation.
  //    FournisseurDocument has no documentType field — BonReception is the
  //    fournisseur-side equivalent of a purchase invoice.
  //    CONFIRMED replaces VALIDATED (v6.0 DocumentStatus has no VALIDATED).
  const outstanding = await prisma.fournisseurDocument.aggregate({
    where: {
      fournisseurId: id,
      bonReception: { isNot: null },
      status: {
        in: ["CONFIRMED", "PARTIAL"],
      },
    },
    _sum: {
      amountDue: true,
    },
  });

  const totalOutstanding = outstanding._sum.amountDue || 0;

  return {
    ...fournisseur,
    totalOutstanding,
    documentCount: fournisseur.documents.length,
  };
};

// ============================================
// UPDATE FOURNISSEUR
// ============================================
export const update = async (id, data, requestingUser = null) => {
  const fournisseur = await prisma.fournisseur.findUnique({ where: { id } });

  if (!fournisseur) {
    throw new ApiError("Fournisseur not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== fournisseur.societeId) {
      throw new ApiError(
        "Access denied. You can only update fournisseurs in your own société.",
        403,
      );
    }
  }

  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }

  if (data.paymentDeadline && typeof data.paymentDeadline === "string") {
    data.paymentDeadline = parseInt(data.paymentDeadline);
  }

  if (data.societeId) {
    data.societeId = parseInt(data.societeId);
  }

  const nextType = data.type ?? fournisseur.type;
  if (nextType !== "SOCIETE") {
    data.ice = null;
    data.if = null;
    data.rc = null;
    data.tp = null;
  } else {
    for (const key of ["ice", "if", "rc", "tp"]) {
      if (data[key] === "") data[key] = null;
    }
  }

  return prisma.fournisseur.update({
    where: { id },
    data,
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
    },
  });
};

// ============================================
// DELETE FOURNISSEUR
// ============================================
export const remove = async (id, requestingUser = null) => {
  const fournisseur = await prisma.fournisseur.findUnique({
    where: { id },
    include: {
      documents: {
        where: {
          // ✅ v6.0 DocumentStatus enum values:
          //    DRAFT, CONFIRMED, PARTIAL, COMPLETED, CANCELLED, PAID
          //    Removed: PENDING (→ DRAFT), VALIDATED (→ CONFIRMED)
          status: {
            in: [
              "DRAFT",
              "CONFIRMED",
              "PARTIAL",
              "COMPLETED",
              "PAID",
              "CANCELLED",
            ],
          },
        },
      },
    },
  });

  if (!fournisseur) {
    throw new ApiError("Fournisseur not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== fournisseur.societeId) {
      throw new ApiError(
        "Access denied. You can only delete fournisseurs in your own société.",
        403,
      );
    }
  }

  if (fournisseur.documents.length > 0) {
    throw new ApiError(
      "Cannot delete fournisseur with active documents. Please close or cancel all documents first.",
      400,
    );
  }

  return prisma.fournisseur.delete({
    where: { id },
  });
};

// ============================================
// GET FOURNISSEUR STATISTICS
// ============================================
export const getStatistics = async (societeId = null) => {
  const where = societeId ? { societeId } : {};

  const totalFournisseurs = await prisma.fournisseur.count({ where });

  const activeFournisseurs = await prisma.fournisseur.count({
    where: { ...where, active: true },
  });

  const particulierCount = await prisma.fournisseur.count({
    where: { ...where, type: "PARTICULIER" },
  });

  const societeCount = await prisma.fournisseur.count({
    where: { ...where, type: "SOCIETE" },
  });

  // ✅ v6.0: bonReception: { isNot: null } replaces documentType: "FACTURE"
  //    BonReception is the purchase-invoice equivalent on the fournisseur side.
  //    CONFIRMED replaces VALIDATED.
  const outstandingWhere = {
    bonReception: { isNot: null },
    status: {
      in: ["CONFIRMED", "PARTIAL"],
    },
  };

  if (societeId) {
    outstandingWhere.societeId = societeId;
  }

  const outstandingData = await prisma.fournisseurDocument.aggregate({
    where: outstandingWhere,
    _sum: {
      amountDue: true,
    },
  });

  // ✅ v6.0: same relation filter for paid receipts
  const paidWhere = {
    bonReception: { isNot: null },
    status: "PAID",
  };

  if (societeId) {
    paidWhere.societeId = societeId;
  }

  const paidData = await prisma.fournisseurDocument.aggregate({
    where: paidWhere,
    _sum: {
      totalTTC: true,
    },
  });

  // ✅ v6.0: filter by bonReception relation, CONFIRMED replaces VALIDATED
  const topFournisseurs = await prisma.fournisseur.findMany({
    where,
    take: 5,
    select: {
      id: true,
      name: true,
      documents: {
        where: {
          bonReception: { isNot: null },
          status: {
            in: ["CONFIRMED", "PARTIAL", "PAID"],
          },
        },
        select: {
          totalTTC: true,
        },
      },
    },
  });

  const topFournisseursWithVolume = topFournisseurs.map((fournisseur) => ({
    id: fournisseur.id,
    name: fournisseur.name,
    totalOrders: fournisseur.documents.length,
    totalPurchases: fournisseur.documents.reduce(
      (sum, doc) => sum + Number(doc.totalTTC),
      0,
    ),
  }));

  topFournisseursWithVolume.sort((a, b) => b.totalPurchases - a.totalPurchases);

  return {
    totalFournisseurs,
    activeFournisseurs,
    inactiveFournisseurs: totalFournisseurs - activeFournisseurs,
    particulierCount,
    societeCount,
    totalOutstanding: outstandingData._sum.amountDue || 0,
    totalPaid: paidData._sum.totalTTC || 0,
    topFournisseurs: topFournisseursWithVolume,
  };
};

// ============================================
// EXPORT FOURNISSEURS TO CSV
// ============================================
const FOURN_CSV_FIELDS = ["id","name","type","phone","email","address","region","website","ice","if","rc","tp","paymentDeadline","bankAccount","bankName","active","societe","createdAt","updatedAt"];

const FOURN_EXCEL_COLUMNS = [
  { header: "ID", key: "id", width: 10 },
  { header: "Name", key: "name", width: 30 },
  { header: "Type", key: "type", width: 15 },
  { header: "Phone", key: "phone", width: 20 },
  { header: "Email", key: "email", width: 30 },
  { header: "Address", key: "address", width: 40 },
  { header: "Region", key: "region", width: 20 },
  { header: "Website", key: "website", width: 30 },
  { header: "ICE", key: "ice", width: 20 },
  { header: "IF", key: "if", width: 20 },
  { header: "RC", key: "rc", width: 20 },
  { header: "TP", key: "tp", width: 20 },
  { header: "Payment Deadline (days)", key: "paymentDeadline", width: 25 },
  { header: "Bank Account", key: "bankAccount", width: 30 },
  { header: "Bank Name", key: "bankName", width: 25 },
  { header: "Active", key: "active", width: 10 },
  { header: "Société", key: "societe", width: 30 },
  { header: "Created At", key: "createdAt", width: 25 },
  { header: "Updated At", key: "updatedAt", width: 25 },
];

const FOURN_EXCEL_NUM_FMTS = {
  id: "@", phone: "@", ice: "@", if: "@", rc: "@", tp: "@", bankAccount: "@",
  paymentDeadline: "0", createdAt: "yyyy-mm-dd hh:mm", updatedAt: "yyyy-mm-dd hh:mm",
};

const FOURN_INCLUDE = { include: { societe: { select: { raisonSocial: true } } }, orderBy: { name: "asc" } };

const PHONE_REGEX = /^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/;

const mapFournToCSV = (f) => ({
  id: asText(f.id), name: f.name, type: f.type, phone: asText(f.phone),
  email: f.email || "", address: f.address || "", region: f.region || "",
  website: f.website || "", ice: asText(f.ice), if: asText(f.if),
  rc: asText(f.rc), tp: asText(f.tp),
  paymentDeadline: f.paymentDeadline != null ? Number(f.paymentDeadline) : "",
  bankAccount: asText(f.bankAccount), bankName: f.bankName || "",
  active: f.active ? "vrai" : "faux",
  societe: f.societe?.raisonSocial || "",
  createdAt: formatDate(f.createdAt), updatedAt: formatDate(f.updatedAt),
});

const mapFournToExcel = (f) => ({
  ...f, id: f.id?.toString(), phone: f.phone?.toString(),
  ice: f.ice?.toString(), if: f.if?.toString(), rc: f.rc?.toString(), tp: f.tp?.toString(),
  bankAccount: f.bankAccount?.toString(),
  paymentDeadline: f.paymentDeadline != null ? Number(f.paymentDeadline) : null,
  active: f.active ? "vrai" : "faux",
  societe: f.societe?.raisonSocial || "",
  createdAt: new Date(f.createdAt), updatedAt: new Date(f.updatedAt),
});

export const exportFournisseursCSV = async (societeId = null) => {
  const fournisseurs = await prisma.fournisseur.findMany({ where: societeId ? { societeId } : {}, ...FOURN_INCLUDE });
  return exportCSV(fournisseurs.map(mapFournToCSV), FOURN_CSV_FIELDS);
};

// ============================================
// EXPORT FOURNISSEURS TO EXCEL
// ============================================
export const exportFournisseursExcel = async (societeId = null) => {
  const fournisseurs = await prisma.fournisseur.findMany({ where: societeId ? { societeId } : {}, ...FOURN_INCLUDE });
  return exportExcel(fournisseurs.map(mapFournToExcel), { worksheetName: "Fournisseurs", columns: FOURN_EXCEL_COLUMNS, numFmts: FOURN_EXCEL_NUM_FMTS });
};

const parseFournCSVRow = (row, societeId) => {
  const phone = fromText(row.phone);
  const ice = fromText(row.ice);
  if (!row.name || !phone) throw new ApiError("Name and phone are required for all fournisseurs", 400);
  if (!PHONE_REGEX.test(phone)) throw new ApiError(`Invalid phone format for fournisseur "${row.name}"`, 400);
  if (ice && !/^\d{15}$/.test(ice)) throw new ApiError(`ICE must be exactly 15 digits for fournisseur "${row.name}"`, 400);
  let paymentDeadline = null;
  if (row.paymentDeadline && row.paymentDeadline !== "") {
    paymentDeadline = parseInt(row.paymentDeadline);
    if (isNaN(paymentDeadline) || paymentDeadline < 0) throw new ApiError(`Invalid payment deadline for fournisseur "${row.name}"`, 400);
  }
  return {
    name: row.name.trim(), type: row.type || "SOCIETE", phone: phone.trim(),
    email: row.email || null, address: row.address || null, region: row.region || null,
    website: row.website || null, ice: ice || null, if: fromText(row.if) || null,
    rc: fromText(row.rc) || null, tp: fromText(row.tp) || null, paymentDeadline,
    bankAccount: fromText(row.bankAccount) || null, bankName: row.bankName || null,
    active: row.active?.toLowerCase() !== "faux", societeId,
    createdAt: parseCSVDate(row.createdAt), updatedAt: parseCSVDate(row.updatedAt),
  };
};

const parseFournExcelRow = (row, rowNumber, societeId) => {
  if (!row.getCell(2).value) return null;
  const name = row.getCell(2).value;
  const type = row.getCell(3).value || "SOCIETE";
  const phone = row.getCell(4).value;
  if (!name) throw new ApiError(`Missing name at row ${rowNumber}`, 400);
  if (!["PARTICULIER", "SOCIETE"].includes(type)) throw new ApiError(`Invalid type at row ${rowNumber}`, 400);
  if (!phone) throw new ApiError(`Missing phone at row ${rowNumber}`, 400);
  if (!PHONE_REGEX.test(String(phone))) throw new ApiError(`Invalid phone format at row ${rowNumber}`, 400);
  const ice = row.getCell(9).value || null;
  if (ice && (String(ice).length !== 15 || !/^\d{15}$/.test(String(ice)))) throw new ApiError(`ICE must be 15 digits at row ${rowNumber}`, 400);
  // Handle hyperlink objects for email (ExcelJS stores mailto: links as {text, hyperlink})
  const rawEmail = row.getCell(5).value;
  const email = rawEmail ? (typeof rawEmail === "object" && rawEmail.text ? rawEmail.text : String(rawEmail)) : null;
  const parseBool = (val) => typeof val === "boolean" ? val : ["vrai","true"].includes(String(val).toLowerCase());
  let paymentDeadline = null;
  const rawPD = row.getCell(13).value;
  if (rawPD != null && rawPD !== "") {
    paymentDeadline = parseInt(rawPD);
    if (isNaN(paymentDeadline) || paymentDeadline < 0) throw new ApiError(`Invalid payment deadline at row ${rowNumber}`, 400);
  }
  return {
    name: String(name).trim(), type, phone: String(phone).trim(),
    email: email ? String(email).trim() : null,
    address: row.getCell(6).value ? String(row.getCell(6).value).trim() : null,
    region: row.getCell(7).value ? String(row.getCell(7).value).trim() : null,
    website: row.getCell(8).value ? String(row.getCell(8).value).trim() : null,
    ice: ice ? String(ice).trim() : null,
    if: row.getCell(10).value ? String(row.getCell(10).value).trim() : null,
    rc: row.getCell(11).value ? String(row.getCell(11).value).trim() : null,
    tp: row.getCell(12).value ? String(row.getCell(12).value).trim() : null,
    paymentDeadline,
    bankAccount: row.getCell(14).value ? String(row.getCell(14).value).trim() : null,
    bankName: row.getCell(15).value ? String(row.getCell(15).value).trim() : null,
    active: parseBool(row.getCell(16).value),
    societeId,
  };
};

const saveFournUpsert = (societeId) => (f) =>
  prisma.fournisseur.upsert({
    where: { societeId_phone: { phone: f.phone, societeId } },
    update: { name: f.name, type: f.type, email: f.email, address: f.address, region: f.region, website: f.website, ice: f.ice, if: f.if, rc: f.rc, tp: f.tp, paymentDeadline: f.paymentDeadline, bankAccount: f.bankAccount, bankName: f.bankName, active: f.active, updatedAt: f.updatedAt },
    create: f,
  });

export const importFournisseursCSV = (buffer, societeId) =>
  importCSV(buffer, (row) => parseFournCSVRow(row, societeId), saveFournUpsert(societeId));

export const importFournisseursExcel = (buffer, societeId) =>
  importExcel(buffer, "Fournisseurs", (row, rowNumber) => parseFournExcelRow(row, rowNumber, societeId), saveFournUpsert(societeId));

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  create,
  getAll,
  getById,
  update,
  remove,
  getStatistics,
  exportFournisseursCSV,
  exportFournisseursExcel,
  importFournisseursCSV,
  importFournisseursExcel,
};
