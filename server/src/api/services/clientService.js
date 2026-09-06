import {
  exportCSV,
  exportExcel,
  importCSV,
  importExcel,
} from "../utils/importExportUtils.js";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { formatDate, parseCSVDate } from "../utils/formatDates.js";
import { asText, fromText } from "../utils/csvHelpers.js";
import { getPhoneSearchVariants } from "../utils/phoneUtils.js";

// ============================================
// CREATE CLIENT
// ============================================
export const create = async (data, societeId) => {
  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }

  if (data.creditLimit && typeof data.creditLimit === "string") {
    data.creditLimit = parseFloat(data.creditLimit);
  }

  if (data.paymentDeadline && typeof data.paymentDeadline === "string") {
    data.paymentDeadline = parseInt(data.paymentDeadline);
  }

  if (data.discount && typeof data.discount === "string") {
    data.discount = parseFloat(data.discount);
  }

  // Individuals don't keep fiscal identifiers
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

  return prisma.client.create({
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
// GET ALL CLIENTS
// ============================================
export const getAll = async (query, societeId = null) => {
  const where = {};

  if (societeId) {
    where.societeId = societeId;
  }

  if (query.keyword) {
    const phoneVariants = getPhoneSearchVariants(query.keyword);
    where.OR = [
      { name: { contains: query.keyword } },
      { email: { contains: query.keyword } },
      { ice: { contains: query.keyword } },
      ...phoneVariants.map((variant) => ({ phone: { contains: variant } })),
    ];
  }

  const count = await prisma.client.count({ where });

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .sort()
    .limitFields({
      id: true,
      name: true,
      societeId: true,
      type: true,
      address: true,
      city: true,
      region: true,
      email: true,
      website: true,
      phone: true,
      ice: true,
      if: true,
      rc: true,
      tp: true,
      active: true,
      isSystem: true,
      societe: { select: { id: true, raisonSocial: true, phone: true } },
    })
    .paginate(count);

  const clients = await prisma.client.findMany({
    ...apiFeatures.build(),
    where,
  });

  return {
    results: clients.length,
    pagination: apiFeatures.paginationResult,
    data: clients,
  };
};

// ============================================
// GET CLIENT BY ID
// ============================================
export const getById = async (id, requestingUser = null) => {
  const client = await prisma.client.findUnique({
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
          // ✅ v6.0: ClientDocument has NO documentType and NO documentDate fields.
          //    documentType is replaced by the existence of a specialized relation.
          //    documentDate lives on the specialized table (Facture.documentDate, etc.).
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

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== client.societeId) {
      throw new ApiError(
        "Access denied. This client belongs to another société.",
        403,
      );
    }
  }

  // ✅ v6.0: Filter invoices via the facture relation (no documentType on header).
  //    CONFIRMED replaces VALIDATED — v6.0 DocumentStatus enum has no VALIDATED.
  const outstanding = await prisma.clientDocument.aggregate({
    where: {
      clientId: id,
      facture: { isNot: null },
      status: {
        in: ["CONFIRMED", "PARTIAL"],
      },
    },
    _sum: {
      amountDue: true,
    },
  });

  const totalOutstanding = outstanding._sum.amountDue || 0;
  const availableCredit = client.creditLimit
    ? client.creditLimit - totalOutstanding
    : null;

  return {
    ...client,
    totalOutstanding,
    availableCredit,
    documentCount: client.documents.length,
  };
};

// ============================================
// UPDATE CLIENT
// ============================================
export const update = async (id, data, requestingUser = null) => {
  const client = await prisma.client.findUnique({ where: { id } });

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== client.societeId) {
      throw new ApiError(
        "Access denied. You can only update clients in your own société.",
        403,
      );
    }
  }

  // isSystem is managed by the system only — never allow clients to override it
  delete data.isSystem;

  if (typeof data.active === "string") {
    data.active = data.active.toLowerCase() === "true";
  }

  if (data.creditLimit && typeof data.creditLimit === "string") {
    data.creditLimit = parseFloat(data.creditLimit);
  }

  if (data.paymentDeadline && typeof data.paymentDeadline === "string") {
    data.paymentDeadline = parseInt(data.paymentDeadline);
  }

  if (data.discount && typeof data.discount === "string") {
    data.discount = parseFloat(data.discount);
  }

  if (data.societeId) {
    data.societeId = parseInt(data.societeId);
  }

  const nextType = data.type ?? client.type;
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

  return prisma.client.update({
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
// DELETE CLIENT
// ============================================
export const remove = async (id, requestingUser = null) => {
  const client = await prisma.client.findUnique({
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

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  if (client.isSystem) {
    throw new ApiError(
      "Impossible de supprimer un client système. Ce client est géré automatiquement par l'application.",
      400,
    );
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== client.societeId) {
      throw new ApiError(
        "Access denied. You can only delete clients in your own société.",
        403,
      );
    }
  }

  if (client.documents.length > 0) {
    throw new ApiError(
      "Cannot delete client with active documents. Please close or cancel all documents first.",
      400,
    );
  }

  return prisma.client.delete({
    where: { id },
  });
};

// ============================================
// CHECK CREDIT LIMIT
// ============================================
export const checkCreditLimit = async (
  clientId,
  newOrderAmount,
  requestingUser = null,
) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new ApiError("Client not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== client.societeId) {
      throw new ApiError("Access denied.", 403);
    }
  }

  if (!client.creditLimit) {
    return {
      isApproved: true,
      message: "No credit limit set - approved",
      availableCredit: null,
    };
  }

  // ✅ v6.0: facture: { isNot: null } replaces documentType: "FACTURE"
  //    CONFIRMED replaces VALIDATED
  const outstanding = await prisma.clientDocument.aggregate({
    where: {
      clientId,
      facture: { isNot: null },
      status: {
        in: ["CONFIRMED", "PARTIAL"],
      },
    },
    _sum: {
      amountDue: true,
    },
  });

  const currentOutstanding = outstanding._sum.amountDue || 0;
  const totalExposure =
    parseFloat(currentOutstanding) + parseFloat(newOrderAmount);
  const availableCredit = client.creditLimit - currentOutstanding;

  if (totalExposure > client.creditLimit) {
    return {
      isApproved: false,
      message: `Credit limit exceeded! Available: ${availableCredit.toFixed(2)} MAD, Requested: ${newOrderAmount.toFixed(2)} MAD`,
      creditLimit: client.creditLimit,
      currentOutstanding,
      availableCredit,
      requestedAmount: newOrderAmount,
      totalExposure,
    };
  }

  return {
    isApproved: true,
    message: "Credit approved",
    creditLimit: client.creditLimit,
    currentOutstanding,
    availableCredit,
    requestedAmount: newOrderAmount,
    totalExposure,
  };
};

// ============================================
// GET CLIENT STATISTICS
// ============================================
export const getStatistics = async (societeId = null) => {
  const where = societeId ? { societeId } : {};

  const totalClients = await prisma.client.count({ where });

  const activeClients = await prisma.client.count({
    where: { ...where, active: true },
  });

  const particulierCount = await prisma.client.count({
    where: { ...where, type: "PARTICULIER" },
  });

  const societeCount = await prisma.client.count({
    where: { ...where, type: "SOCIETE" },
  });

  // ✅ v6.0: facture: { isNot: null } replaces documentType: "FACTURE"
  //    CONFIRMED replaces VALIDATED
  const outstandingWhere = {
    //   facture: { isNot: null },
    //   status: {
    //     in: ["CONFIRMED", "PARTIAL"],
    //   },
  };

  if (societeId) {
    outstandingWhere.societeId = societeId;
  }

  const outstandingData = await prisma.reglementClient.aggregate({
    // where: outstandingWhere,
    _sum: {
      montantBL: true,
    },
  });

  // ✅ v6.0: filter by facture relation, CONFIRMED replaces VALIDATED
  // const topClients = await prisma.client.findMany({
  //   where,
  //   take: 5,
  //   select: {
  //     id: true,
  //     name: true,
  //     documents: {
  //       where: {
  //         facture: { isNot: null },
  //         status: {
  //           in: ["CONFIRMED", "PARTIAL", "PAID"],
  //         },
  //       },
  //       select: {
  //         totalTTC: true,
  //       },
  //     },
  //   },
  // });
  const topClients = await prisma.client.findMany({
    where,
    take: 5,
    select: {
      id: true,
      name: true,
      documents: {
        where: {
          documentNumber: {
            startsWith: "BL",
          },
        },
        select: {
          amountDue: true,
          documentNumber: true,
        },
      },
    },
  });
  const topClientsWithRevenue = topClients.map((client) => ({
    id: client.id,
    name: client.name,
    totalOrders: client.documents.length,
    totalRevenue: client.documents.reduce(
      (sum, doc) => sum + Number(doc.amountDue),
      0,
    ),
  }));

  topClientsWithRevenue.sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,
    particulierCount,
    societeCount,
    totalOutstanding: outstandingData._sum.montantBL || 0,
    topClients: topClientsWithRevenue,
  };
};

// ============================================
// EXPORT CLIENTS TO CSV
// ============================================
const CLIENT_CSV_FIELDS = [
  "id",
  "name",
  "type",
  "phone",
  "email",
  "address",
  "city",
  "region",
  "website",
  "ice",
  "if",
  "rc",
  "tp",
  "creditLimit",
  "paymentDeadline",
  "discount",
  "active",
  "societe",
  "createdAt",
  "updatedAt",
];

const CLIENT_EXCEL_COLUMNS = [
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
  { header: "Credit Limit (MAD)", key: "creditLimit", width: 20 },
  { header: "Payment Deadline (days)", key: "paymentDeadline", width: 25 },
  { header: "Discount (%)", key: "discount", width: 15 },
  { header: "Active", key: "active", width: 10 },
  { header: "Société", key: "societe", width: 30 },
  { header: "Created At", key: "createdAt", width: 25 },
  { header: "Updated At", key: "updatedAt", width: 25 },
];

const CLIENT_EXCEL_NUM_FMTS = {
  id: "@",
  phone: "@",
  ice: "@",
  if: "@",
  rc: "@",
  tp: "@",
  creditLimit: "#,##0.00",
  paymentDeadline: "0",
  discount: "0.00",
  createdAt: "yyyy-mm-dd hh:mm",
  updatedAt: "yyyy-mm-dd hh:mm",
};

const CLIENT_INCLUDE = {
  include: { societe: { select: { raisonSocial: true } } },
  orderBy: { name: "asc" },
};

const PHONE_REGEX = /^(?:\+212\s?[5-7](\s?\d{2}){4}|0[5-7](\s?\d{2}){4})$/;

const mapClientToCSV = (c) => ({
  id: asText(c.id),
  name: c.name,
  type: c.type,
  phone: asText(c.phone),
  email: c.email || "",
  address: c.address || "",
  city: c.city || "",
  region: c.region || "",
  website: c.website || "",
  ice: asText(c.ice),
  if: asText(c.if),
  rc: asText(c.rc),
  tp: asText(c.tp),
  creditLimit: c.creditLimit != null ? Number(c.creditLimit) : "",
  paymentDeadline: c.paymentDeadline != null ? Number(c.paymentDeadline) : "",
  discount: c.discount != null ? Number(c.discount) : "",
  active: c.active ? "vrai" : "faux",
  societe: c.societe?.raisonSocial || "",
  createdAt: formatDate(c.createdAt),
  updatedAt: formatDate(c.updatedAt),
});

const mapClientToExcel = (c) => ({
  ...c,
  id: c.id?.toString(),
  phone: c.phone?.toString(),
  ice: c.ice?.toString(),
  if: c.if?.toString(),
  rc: c.rc?.toString(),
  tp: c.tp?.toString(),
  creditLimit: c.creditLimit != null ? Number(c.creditLimit) : null,
  paymentDeadline: c.paymentDeadline != null ? Number(c.paymentDeadline) : null,
  discount: c.discount != null ? Number(c.discount) : null,
  active: c.active ? "vrai" : "faux",
  societe: c.societe?.raisonSocial || "",
  createdAt: new Date(c.createdAt),
  updatedAt: new Date(c.updatedAt),
});

export const exportClientsCSV = async (societeId = null) => {
  const clients = await prisma.client.findMany({
    where: societeId ? { societeId } : {},
    ...CLIENT_INCLUDE,
  });
  return exportCSV(clients.map(mapClientToCSV), CLIENT_CSV_FIELDS);
};

export const exportClientsExcel = async (societeId = null) => {
  const clients = await prisma.client.findMany({
    where: societeId ? { societeId } : {},
    ...CLIENT_INCLUDE,
  });
  return exportExcel(clients.map(mapClientToExcel), {
    worksheetName: "Clients",
    columns: CLIENT_EXCEL_COLUMNS,
    numFmts: CLIENT_EXCEL_NUM_FMTS,
  });
};

const parseClientCSVRow = (row, societeId) => {
  const phone = fromText(row.phone);
  const ice = fromText(row.ice);
  if (!row.name || !phone)
    throw new ApiError("Name and phone are required for all clients", 400);
  if (!PHONE_REGEX.test(phone))
    throw new ApiError(`Invalid phone format for client "${row.name}"`, 400);
  if (ice && !/^\d{15}$/.test(ice))
    throw new ApiError(
      `ICE must be exactly 15 digits for client "${row.name}"`,
      400,
    );

  let creditLimit = null;
  if (row.creditLimit && row.creditLimit !== "") {
    creditLimit = parseFloat(row.creditLimit);
    if (isNaN(creditLimit) || creditLimit < 0)
      throw new ApiError(`Invalid credit limit for client "${row.name}"`, 400);
  }
  let paymentDeadline = null;
  if (row.paymentDeadline && row.paymentDeadline !== "") {
    paymentDeadline = parseInt(row.paymentDeadline);
    if (isNaN(paymentDeadline) || paymentDeadline < 0)
      throw new ApiError(
        `Invalid payment deadline for client "${row.name}"`,
        400,
      );
  }
  let discount = null;
  if (row.discount && row.discount !== "") {
    discount = parseFloat(row.discount);
    if (isNaN(discount) || discount < 0 || discount > 100)
      throw new ApiError(
        `Discount must be between 0 and 100 for client "${row.name}"`,
        400,
      );
  }
  return {
    name: row.name.trim(),
    type: row.type || "PARTICULIER",
    phone: phone.trim(),
    email: row.email || null,
    address: row.address || null,
    city: row.city || null,
    region: row.region || null,
    website: row.website || null,
    ice: ice || null,
    if: fromText(row.if) || null,
    rc: fromText(row.rc) || null,
    tp: fromText(row.tp) || null,
    creditLimit,
    paymentDeadline,
    discount,
    active: row.active?.toLowerCase() !== "faux",
    societeId,
    createdAt: parseCSVDate(row.createdAt),
    updatedAt: parseCSVDate(row.updatedAt),
  };
};

const parseClientExcelRow = (row, rowNumber, societeId) => {
  if (!row.getCell(2).value) return null;
  const name = row.getCell(2).value;
  const type = row.getCell(3).value || "PARTICULIER";
  const phone = row.getCell(4).value;
  if (!name) throw new ApiError(`Missing name at row ${rowNumber}`, 400);
  if (!["PARTICULIER", "SOCIETE"].includes(type))
    throw new ApiError(`Invalid type at row ${rowNumber}`, 400);
  if (!phone) throw new ApiError(`Missing phone at row ${rowNumber}`, 400);
  if (!PHONE_REGEX.test(String(phone)))
    throw new ApiError(`Invalid phone format at row ${rowNumber}`, 400);
  const ice = row.getCell(9).value;
  if (ice && (String(ice).length !== 15 || !/^\d{15}$/.test(String(ice))))
    throw new ApiError(`ICE must be 15 digits at row ${rowNumber}`, 400);

  const parseNum = (val, label, min, max) => {
    if (val == null || val === "") return null;
    const n = label === "paymentDeadline" ? parseInt(val) : parseFloat(val);
    if (isNaN(n) || n < min || (max != null && n > max))
      throw new ApiError(`Invalid ${label} at row ${rowNumber}`, 400);
    return n;
  };
  const parseBool = (val) =>
    typeof val === "boolean"
      ? val
      : ["vrai", "true"].includes(String(val).toLowerCase());

  return {
    name: String(name).trim(),
    type,
    phone: String(phone).trim(),
    email: row.getCell(5).value ? String(row.getCell(5).value).trim() : null,
    address: row.getCell(6).value ? String(row.getCell(6).value).trim() : null,
    region: row.getCell(7).value ? String(row.getCell(7).value).trim() : null,
    website: row.getCell(8).value ? String(row.getCell(8).value).trim() : null,
    ice: ice ? String(ice).trim() : null,
    if: row.getCell(10).value ? String(row.getCell(10).value).trim() : null,
    rc: row.getCell(11).value ? String(row.getCell(11).value).trim() : null,
    tp: row.getCell(12).value ? String(row.getCell(12).value).trim() : null,
    creditLimit: parseNum(row.getCell(13).value, "creditLimit", 0, null),
    paymentDeadline: parseNum(
      row.getCell(14).value,
      "paymentDeadline",
      0,
      null,
    ),
    discount: parseNum(row.getCell(15).value, "discount", 0, 100),
    active: parseBool(row.getCell(16).value),
    societeId,
  };
};

const saveClientUpsert = (societeId) => (client) =>
  prisma.client.upsert({
    where: { societeId_phone: { phone: client.phone, societeId } },
    update: {
      name: client.name,
      type: client.type,
      email: client.email,
      address: client.address,
      city: client.city,
      region: client.region,
      website: client.website,
      ice: client.ice,
      if: client.if,
      rc: client.rc,
      tp: client.tp,
      creditLimit: client.creditLimit,
      paymentDeadline: client.paymentDeadline,
      discount: client.discount,
      active: client.active,
      updatedAt: client.updatedAt,
    },
    create: client,
  });

export const importClientsCSV = (buffer, societeId) =>
  importCSV(
    buffer,
    (row) => parseClientCSVRow(row, societeId),
    saveClientUpsert(societeId),
  );

export const importClientsExcel = (buffer, societeId) =>
  importExcel(
    buffer,
    "Clients",
    (row, rowNumber) => parseClientExcelRow(row, rowNumber, societeId),
    saveClientUpsert(societeId),
  );

// ============================================
// EXPORT DEFAULT
// ============================================
export default {
  create,
  getAll,
  getById,
  update,
  remove,
  checkCreditLimit,
  getStatistics,
  exportClientsCSV,
  exportClientsExcel,
  importClientsCSV,
  importClientsExcel,
};
