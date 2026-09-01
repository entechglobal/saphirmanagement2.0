import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

/* ============================================================
   COLIS TRACKING — GET ALL

   Returns paginated ADVANCED BonLivraison records that:
     - have a colisTrackingNumber (i.e. the parcel was created)
     - have NOT yet been received (colisSync ≠ RECEIVED)
   Scoped to caller's société (SuperAdmin sees all).
============================================================ */
export const getAll = async (query, user) => {
  const { page = 1, limit = 20, search } = query;

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  const where = {
    type: "ADVANCED",
    commandStatus: "ANNULE",
    colisTrackingNumber: { not: null },
    colisSync: { not: "RECEIVED" },
    ...(user.isSuperAdmin ? {} : { document: { societeId: user.societeId } }),
    ...(search && {
      OR: [
        { colisTrackingNumber: { contains: search } },
        { document: { clientName: { contains: search } } },
        { ville: { contains: search } },
      ],
    }),
  };

  const [total, rows] = await Promise.all([
    prisma.bonLivraison.count({ where }),
    prisma.bonLivraison.findMany({
      where,
      select: {
        id: true,
        commandStatus: true,
        colisTrackingNumber: true,
        colisProvider: true,
        colisSync: true,
        dateLivraison: true,
        ville: true,
        telephone: true,
        whatsapp: true,
        document: {
          select: {
            documentNumber: true,
            clientName: true,
            amountDue: true,
            amountPaid: true,
          },
        },
        livreur: { select: { id: true, name: true, type: true } },
        agence: { select: { id: true, name: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    }),
  ]);

  const fmt = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const data = rows.map((bl) => ({
    id: bl.id,
    documentNumber: bl.document?.documentNumber ?? null,
    colisTrackingNumber: bl.colisTrackingNumber,
    colisProvider: bl.colisProvider,
    colisSync: bl.colisSync,
    clientName: bl.document?.clientName ?? null,
    ville: bl.ville,
    telephone: bl.telephone,
    whatsapp: bl.whatsapp,
    dateLivraison: fmt(bl.dateLivraison),
    commandStatus: bl.commandStatus,
    amountDue: parseFloat(bl.document?.amountDue || 0),
    amountPaid: parseFloat(bl.document?.amountPaid || 0),
    livreur: bl.livreur ?? null,
    agenceName: bl.agence?.name ?? null,
  }));

  return {
    data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   MARK AS RECEIVED

   Triggered after barcode scanning of a returned colis.
   Looks up the ADVANCED BL by colisTrackingNumber and sets
   colisSync = RECEIVED. Only acts on records that already
   have a tracking number (i.e. were created at the carrier).
============================================================ */
export const markAsReceived = async (colisTrackingNumber, user) => {
  if (!colisTrackingNumber?.trim()) {
    throw new ApiError("colisTrackingNumber is required", 400);
  }

  const bl = await prisma.bonLivraison.findFirst({
    where: {
      type: "ADVANCED",
      colisTrackingNumber: colisTrackingNumber.trim(),
      ...(user.isSuperAdmin ? {} : { document: { societeId: user.societeId } }),
    },
    select: {
      id: true,
      colisTrackingNumber: true,
      colisSync: true,
      colisProvider: true,
      commandStatus: true,
      document: { select: { documentNumber: true, clientName: true } },
    },
  });

  if (!bl) {
    throw new ApiError(
      `No advanced BL found with tracking number: ${colisTrackingNumber}`,
      404,
    );
  }
  if (bl.colisSync === "RECEIVED") {
    throw new ApiError("This colis is already marked as received", 409);
  }

  const updated = await prisma.bonLivraison.update({
    where: { id: bl.id },
    data: { colisSync: "RECEIVED" },
    select: {
      id: true,
      colisTrackingNumber: true,
      colisSync: true,
      colisProvider: true,
      commandStatus: true,
      document: { select: { documentNumber: true, clientName: true } },
    },
  });

  return updated;
};
