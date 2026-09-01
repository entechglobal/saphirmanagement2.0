import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import {
  CAISSE_INCLUDE,
  INCOME_TYPES,
  OUTFLOW_TYPES,
  TRANSFER_TYPES,
} from "./caisseWalletHelper.js";

// -----------------------------------------------
// HELPERS
// -----------------------------------------------

const isInstitutionalWallet = (caisse) =>
  caisse.caisseType === "BANK" || caisse.caisseType === "COFFRE";

const assertSocieteAccess = (currentUser, societeId) => {
  if (!currentUser.isSuperAdmin && societeId !== currentUser.societeId) {
    throw new ApiError("Accès refusé: hors de votre société", 403);
  }
};

const resolveTargetSocieteId = (currentUser, societeId) => {
  if (currentUser.isSuperAdmin) {
    if (!societeId) throw new ApiError("La société est requise", 400);
    return parseInt(societeId);
  }
  return currentUser.societeId;
};

const isSocieteAdmin = (user) =>
  !user.isSuperAdmin && user.roleName === "Societe_Admin";

const isAdminLevel = (user) => user.isSuperAdmin || isSocieteAdmin(user);

async function createInstitutionalWallet(data, currentUser, caisseType) {
  if (!isAdminLevel(currentUser)) {
    throw new ApiError("Accès refusé", 403);
  }

  const { societeId, banqueId, name, initialBalance = 0 } = data;
  const targetSocieteId = resolveTargetSocieteId(currentUser, societeId);
  const balance = parseFloat(initialBalance) || 0;

  if (caisseType === "BANK") {
    if (!banqueId) throw new ApiError("La banque est requise", 400);
    const banque = await prisma.banque.findUnique({
      where: { id: parseInt(banqueId) },
    });
    if (!banque) throw new ApiError("Banque introuvable", 404);

    const existing = await prisma.caisse.findFirst({
      where: {
        societeId: targetSocieteId,
        banqueId: parseInt(banqueId),
        caisseType: "BANK",
      },
    });
    if (existing) {
      throw new ApiError("Un wallet existe déjà pour cette banque", 409);
    }

    const walletName = name?.trim() || `Wallet Banque - ${banque.name}`;

    return prisma.$transaction(async (tx) => {
      const caisse = await tx.caisse.create({
        data: {
          societeId: targetSocieteId,
          banqueId: parseInt(banqueId),
          caisseType: "BANK",
          name: walletName,
          initialBalance: balance,
          currentBalance: balance,
          active: true,
          createdById: currentUser.id,
        },
        include: CAISSE_INCLUDE,
      });

      if (balance > 0) {
        await tx.caisseTransaction.create({
          data: {
            caisseId: caisse.id,
            transactionType: "INITIAL_BALANCE",
            amount: balance,
            oldBalance: 0,
            newBalance: balance,
            note: "Solde initial",
            createdBy: currentUser.id,
          },
        });
      }

      return caisse;
    });
  }

  if (caisseType === "COFFRE") {
    const walletName = name?.trim() || "Coffre Fort";
    return prisma.$transaction(async (tx) => {
      const caisse = await tx.caisse.create({
        data: {
          societeId: targetSocieteId,
          caisseType: "COFFRE",
          name: walletName,
          initialBalance: balance,
          currentBalance: balance,
          active: true,
          createdById: currentUser.id,
        },
        include: CAISSE_INCLUDE,
      });

      if (balance > 0) {
        await tx.caisseTransaction.create({
          data: {
            caisseId: caisse.id,
            transactionType: "INITIAL_BALANCE",
            amount: balance,
            oldBalance: 0,
            newBalance: balance,
            note: "Solde initial",
            createdBy: currentUser.id,
          },
        });
      }

      return caisse;
    });
  }

  throw new ApiError("Type de wallet invalide", 400);
}

export const createBankWallet = (data, currentUser) =>
  createInstitutionalWallet(data, currentUser, "BANK");

export const createCoffreWallet = (data, currentUser) =>
  createInstitutionalWallet(data, currentUser, "COFFRE");

function determineCaisseType(targetUser) {
  if (targetUser.isSuperAdmin) return "CENTRAL";
  if (targetUser.role?.name === "Societe_Admin") return "SOCIETE";
  return "USER";
}

// -----------------------------------------------
// CAISSE CRUD
// -----------------------------------------------

function generateCaisseName(targetUser, caisseType) {
  if (caisseType === "CENTRAL") return "Caisse Centrale";
  if (caisseType === "SOCIETE")
    return `Wallet Société - ${targetUser.societe?.raisonSocial || targetUser.name}`;
  return `Wallet Utilisateur - ${targetUser.name}`;
}

export const create = async (data, currentUser) => {
  const { userId, initialBalance = 0 } = data;

  const targetUser = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
    include: {
      role: true,
      societe: { select: { id: true, raisonSocial: true } },
    },
  });
  if (!targetUser) throw new ApiError("Utilisateur introuvable", 404);
  if (!targetUser.active)
    throw new ApiError("L'utilisateur est désactivé", 400);

  // Societe admin: can only create within their société
  if (!currentUser.isSuperAdmin) {
    if (targetUser.societeId !== currentUser.societeId) {
      throw new ApiError(
        "Accès refusé: utilisateur hors de votre société",
        403
      );
    }
  }

  const existing = await prisma.caisse.findUnique({
    where: { userId: parseInt(userId) },
  });
  if (existing)
    throw new ApiError("Cet utilisateur possède déjà une caisse", 409);

  const caisseType = determineCaisseType(targetUser);
  const societeId = targetUser.societeId || null;
  const balance = parseFloat(initialBalance) || 0;
  const name = generateCaisseName(targetUser, caisseType);

  return prisma.$transaction(async (tx) => {
    const caisse = await tx.caisse.create({
      data: {
        userId: parseInt(userId),
        societeId,
        caisseType,
        name,
        initialBalance: balance,
        currentBalance: balance,
        active: true,
      },
      include: CAISSE_INCLUDE,
    });

    if (balance > 0) {
      await tx.caisseTransaction.create({
        data: {
          caisseId: caisse.id,
          transactionType: "INITIAL_BALANCE",
          amount: balance,
          oldBalance: 0,
          newBalance: balance,
          note: "Solde initial",
          createdBy: currentUser.id,
        },
      });
    }

    return caisse;
  });
};

export const getAll = async (query, currentUser) => {
  const {
    page = 1,
    limit = 20,
    search,
    caisseType,
    active,
    societeId,
  } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let where = {};

  if (currentUser.isSuperAdmin) {
    if (societeId) where.societeId = parseInt(societeId);
    if (caisseType) where.caisseType = caisseType;
  } else if (isSocieteAdmin(currentUser)) {
    where.societeId = currentUser.societeId;
    if (caisseType) where.caisseType = caisseType;
  } else {
    // Normal user: only own caisse
    where.userId = currentUser.id;
  }

  if (active !== undefined)
    where.active = active === "true" || active === true;

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
    ];
  }

  const [caisses, total] = await Promise.all([
    prisma.caisse.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: CAISSE_INCLUDE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.caisse.count({ where }),
  ]);

  return {
    data: caisses,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

export const createMyCaisse = async (data, currentUser) => {
  return create({ userId: currentUser.id, initialBalance: data.initialBalance ?? 0 }, currentUser);
};

export const getMyCaisse = async (currentUser) => {
  return prisma.caisse.findUnique({
    where: { userId: currentUser.id },
    include: CAISSE_INCLUDE,
  });
};

export const getById = async (id, currentUser) => {
  const caisse = await prisma.caisse.findUnique({
    where: { id: parseInt(id) },
    include: CAISSE_INCLUDE,
  });
  if (!caisse) throw new ApiError("Caisse introuvable", 404);

  if (!currentUser.isSuperAdmin) {
    if (isSocieteAdmin(currentUser)) {
      if (caisse.societeId !== currentUser.societeId)
        throw new ApiError("Accès refusé", 403);
    } else if (isInstitutionalWallet(caisse)) {
      throw new ApiError("Accès refusé", 403);
    } else if (caisse.userId !== currentUser.id) {
      throw new ApiError("Accès refusé", 403);
    }
  }

  return caisse;
};

export const update = async (id, data, currentUser) => {
  const caisse = await getById(id, currentUser);
  const { name, active } = data;

  return prisma.caisse.update({
    where: { id: caisse.id },
    data: {
      ...(name !== undefined && { name }),
      ...(active !== undefined && { active }),
    },
    include: CAISSE_INCLUDE,
  });
};

export const remove = async (id, currentUser) => {
  const caisse = await getById(id, currentUser);

  if (parseFloat(caisse.currentBalance) !== 0) {
    throw new ApiError(
      "Impossible de supprimer une caisse avec un solde non nul",
      400
    );
  }

  await prisma.caisse.delete({ where: { id: caisse.id } });
};

// -----------------------------------------------
// CHARGE (EXPENSE)
// -----------------------------------------------

export const createCharge = async (data, currentUser) => {
  const { labelId, amount, note, caisseId } = data;
  const chargeAmount = parseFloat(amount);

  let caisse;
  if (caisseId && isAdminLevel(currentUser)) {
    caisse = await getById(caisseId, currentUser);
  } else {
    caisse = await prisma.caisse.findUnique({
      where: { userId: currentUser.id },
    });
  }
  if (!caisse) throw new ApiError("Vous n'avez pas de caisse configurée", 404);
  if (!caisse.active) throw new ApiError("Votre caisse est désactivée", 400);

  if (labelId) {
    const label = await prisma.caisseLabel.findUnique({
      where: { id: parseInt(labelId) },
    });
    if (!label || !label.active)
      throw new ApiError("Libellé introuvable ou inactif", 404);
  }

  const currentBalance = parseFloat(caisse.currentBalance);
  if (chargeAmount > currentBalance) {
    throw new ApiError(
      `Solde insuffisant. Solde actuel: ${currentBalance.toFixed(2)} MAD`,
      400
    );
  }

  const newBalance = parseFloat((currentBalance - chargeAmount).toFixed(2));

  return prisma.$transaction(async (tx) => {
    await tx.caisse.update({
      where: { id: caisse.id },
      data: { currentBalance: newBalance },
    });

    return tx.caisseTransaction.create({
      data: {
        caisseId: caisse.id,
        transactionType: "CHARGE",
        labelId: labelId ? parseInt(labelId) : null,
        amount: -chargeAmount,
        oldBalance: currentBalance,
        newBalance,
        note: note || null,
        createdBy: currentUser.id,
      },
      include: {
        label: { select: { id: true, name: true } },
        caisse: { select: { id: true, name: true, currentBalance: true } },
        creator: { select: { id: true, name: true } },
      },
    });
  });
};

// -----------------------------------------------
// TRANSFERABLE CAISSES (for dropdown selection)
// -----------------------------------------------

export const getTransferableCaisses = async (query, currentUser) => {
  const { societeId, search, page = 1, limit = 100, excludeCaisseId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let where = { active: true };

  if (currentUser.isSuperAdmin) {
    if (societeId) where.societeId = parseInt(societeId);
  } else {
    if (!currentUser.societeId) {
      throw new ApiError("Aucune société associée à votre compte", 400);
    }
    where.societeId = currentUser.societeId;
  }

  if (excludeCaisseId) {
    where.NOT = { id: parseInt(excludeCaisseId) };
  }

  if (search) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { name: { contains: search } },
          { user: { name: { contains: search } } },
          { banque: { name: { contains: search } } },
        ],
      },
    ];
  }

  const [caisses, total] = await Promise.all([
    prisma.caisse.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: CAISSE_INCLUDE,
      orderBy: [{ caisseType: "asc" }, { name: "asc" }],
    }),
    prisma.caisse.count({ where }),
  ]);

  return {
    data: caisses,
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  };
};

// -----------------------------------------------
// TRANSFER (internal — used by retrait and depot)
// -----------------------------------------------

const executeTransfer = async (
  sourceCaisse,
  destinationCaisse,
  amount,
  note,
  currentUser
) => {
  const transferAmount = parseFloat(amount);
  const sourceBalance = parseFloat(sourceCaisse.currentBalance);

  if (transferAmount > sourceBalance) {
    throw new ApiError(
      `Solde insuffisant dans la caisse source. Solde actuel: ${sourceBalance.toFixed(2)} MAD`,
      400
    );
  }

  const sourceNewBalance = parseFloat(
    (sourceBalance - transferAmount).toFixed(2)
  );
  const destCurrentBalance = parseFloat(destinationCaisse.currentBalance);
  const destNewBalance = parseFloat(
    (destCurrentBalance + transferAmount).toFixed(2)
  );

  return prisma.$transaction(async (tx) => {
    await tx.caisse.update({
      where: { id: sourceCaisse.id },
      data: { currentBalance: sourceNewBalance },
    });
    await tx.caisse.update({
      where: { id: destinationCaisse.id },
      data: { currentBalance: destNewBalance },
    });

    const [txOut, txIn] = await Promise.all([
      tx.caisseTransaction.create({
        data: {
          caisseId: sourceCaisse.id,
          transactionType: "TRANSFER_OUT",
          amount: -transferAmount,
          oldBalance: sourceBalance,
          newBalance: sourceNewBalance,
          note: note || null,
          referenceCaisseId: destinationCaisse.id,
          createdBy: currentUser.id,
        },
      }),
      tx.caisseTransaction.create({
        data: {
          caisseId: destinationCaisse.id,
          transactionType: "TRANSFER_IN",
          amount: transferAmount,
          oldBalance: destCurrentBalance,
          newBalance: destNewBalance,
          note: note || null,
          referenceCaisseId: sourceCaisse.id,
          createdBy: currentUser.id,
        },
      }),
    ]);

    return {
      transactionOut: txOut,
      transactionIn: txIn,
      source: {
        id: sourceCaisse.id,
        name: sourceCaisse.name,
        newBalance: sourceNewBalance,
      },
      destination: {
        id: destinationCaisse.id,
        name: destinationCaisse.name,
        newBalance: destNewBalance,
      },
    };
  });
};

// -----------------------------------------------
// RETRAIT CAISSE — Selected Wallet → Admin's Caisse
// -----------------------------------------------

export const createRetrait = async (data, currentUser) => {
  const { sourceCaisseId, amount, note } = data;

  if (!isAdminLevel(currentUser)) {
    throw new ApiError("Vous n'avez pas la permission d'effectuer un retrait", 403);
  }

  const [sourceCaisse, adminCaisse] = await Promise.all([
    prisma.caisse.findUnique({ where: { id: parseInt(sourceCaisseId) } }),
    prisma.caisse.findUnique({ where: { userId: currentUser.id } }),
  ]);

  if (!sourceCaisse) throw new ApiError("Caisse source introuvable", 404);
  if (!adminCaisse) throw new ApiError("Vous n'avez pas de caisse configurée", 404);
  if (!sourceCaisse.active) throw new ApiError("La caisse source est désactivée", 400);
  if (!adminCaisse.active) throw new ApiError("Votre caisse est désactivée", 400);
  if (sourceCaisse.id === adminCaisse.id)
    throw new ApiError("La source et la destination ne peuvent pas être identiques", 400);

  if (isSocieteAdmin(currentUser)) {
    if (sourceCaisse.societeId !== currentUser.societeId) {
      throw new ApiError("Transfert interdit hors de votre société", 403);
    }
    if (sourceCaisse.caisseType !== "USER") {
      throw new ApiError("Vous ne pouvez effectuer un retrait que depuis une caisse utilisateur", 400);
    }
  }

  return executeTransfer(sourceCaisse, adminCaisse, amount, note, currentUser);
};

// -----------------------------------------------
// DEPOT CAISSE — Admin's Caisse → Selected Wallet
// -----------------------------------------------

export const createDepot = async (data, currentUser) => {
  const { destinationCaisseId, amount, note } = data;

  if (!isAdminLevel(currentUser)) {
    throw new ApiError("Vous n'avez pas la permission d'effectuer un dépôt", 403);
  }

  const [destinationCaisse, adminCaisse] = await Promise.all([
    prisma.caisse.findUnique({ where: { id: parseInt(destinationCaisseId) } }),
    prisma.caisse.findUnique({ where: { userId: currentUser.id } }),
  ]);

  if (!destinationCaisse) throw new ApiError("Caisse destination introuvable", 404);
  if (!adminCaisse) throw new ApiError("Vous n'avez pas de caisse configurée", 404);
  if (!destinationCaisse.active) throw new ApiError("La caisse destination est désactivée", 400);
  if (!adminCaisse.active) throw new ApiError("Votre caisse est désactivée", 400);
  if (destinationCaisse.id === adminCaisse.id)
    throw new ApiError("La source et la destination ne peuvent pas être identiques", 400);

  if (isSocieteAdmin(currentUser)) {
    if (destinationCaisse.societeId !== currentUser.societeId) {
      throw new ApiError("Transfert interdit hors de votre société", 403);
    }
    if (destinationCaisse.caisseType !== "USER") {
      throw new ApiError("Vous ne pouvez effectuer un dépôt que vers une caisse utilisateur", 400);
    }
  }

  return executeTransfer(adminCaisse, destinationCaisse, amount, note, currentUser);
};

// -----------------------------------------------
// GENERIC TRANSFER — Any wallet → Any wallet
// -----------------------------------------------

export const createTransfer = async (data, currentUser) => {
  const { sourceCaisseId, destinationCaisseId, amount, note } = data;

  const [sourceCaisse, destinationCaisse] = await Promise.all([
    prisma.caisse.findUnique({
      where: { id: parseInt(sourceCaisseId) },
      include: CAISSE_INCLUDE,
    }),
    prisma.caisse.findUnique({
      where: { id: parseInt(destinationCaisseId) },
      include: CAISSE_INCLUDE,
    }),
  ]);

  if (!sourceCaisse) throw new ApiError("Caisse source introuvable", 404);
  if (!destinationCaisse) throw new ApiError("Caisse destination introuvable", 404);
  if (!sourceCaisse.active) throw new ApiError("La caisse source est désactivée", 400);
  if (!destinationCaisse.active) throw new ApiError("La caisse destination est désactivée", 400);
  if (sourceCaisse.id === destinationCaisse.id) {
    throw new ApiError("La source et la destination ne peuvent pas être identiques", 400);
  }

  if (!currentUser.isSuperAdmin) {
    const ownCaisse = await prisma.caisse.findUnique({
      where: { userId: currentUser.id },
    });
    if (!ownCaisse) {
      throw new ApiError("Vous n'avez pas de wallet configuré", 400);
    }
    if (sourceCaisse.id !== ownCaisse.id) {
      throw new ApiError(
        "Vous ne pouvez transférer que depuis votre propre wallet",
        403,
      );
    }
    if (
      !destinationCaisse.societeId ||
      destinationCaisse.societeId !== currentUser.societeId
    ) {
      throw new ApiError("Transfert interdit hors de votre société", 403);
    }
  }

  return executeTransfer(sourceCaisse, destinationCaisse, amount, note, currentUser);
};

// -----------------------------------------------
// TRANSACTIONS (per-caisse)
// -----------------------------------------------

export const getTransactions = async (caisseId, query, currentUser) => {
  const { page = 1, limit = 20, direction, dateFrom, dateTo } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // This calls getById which enforces access control
  const caisse = await getById(caisseId, currentUser);

  let typeFilter;
  if (direction === "in") typeFilter = { in: INCOME_TYPES };
  if (direction === "out") typeFilter = { in: OUTFLOW_TYPES };
  if (direction === "transfer") typeFilter = { in: TRANSFER_TYPES };

  const where = {
    caisseId: caisse.id,
    ...(typeFilter && { transactionType: typeFilter }),
    ...buildDateFilter(dateFrom, dateTo),
  };

  const [transactions, total] = await Promise.all([
    prisma.caisseTransaction.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        label: { select: { id: true, name: true } },
        referenceCaisse: {
          select: {
            id: true,
            name: true,
            caisseType: true,
            user: { select: { id: true, name: true } },
          },
        },
        reglementClient: {
          select: { id: true, modeReglement: true, montantRegle: true },
        },
        reglementFournisseur: {
          select: { id: true, modeReglement: true, montantRegle: true },
        },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.caisseTransaction.count({ where }),
  ]);

  return {
    data: transactions,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

// -----------------------------------------------
// TRANSACTIONS (global — with user/role filters)
// -----------------------------------------------

export const getAllTransactions = async (query, currentUser) => {
  const {
    page = 1,
    limit = 20,
    direction,
    dateFrom,
    dateTo,
    userId,
    roleId,
  } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build caisse scope filter
  let caisseWhere = {};
  if (currentUser.isSuperAdmin) {
    if (userId) caisseWhere.userId = parseInt(userId);
    if (roleId) caisseWhere.user = { roleId: parseInt(roleId) };
  } else if (isSocieteAdmin(currentUser)) {
    caisseWhere.societeId = currentUser.societeId;
    if (userId) caisseWhere.userId = parseInt(userId);
    if (roleId) caisseWhere.user = { roleId: parseInt(roleId) };
  } else {
    caisseWhere.userId = currentUser.id;
  }

  const matchingCaisses = await prisma.caisse.findMany({
    where: caisseWhere,
    select: { id: true },
  });
  const caisseIds = matchingCaisses.map((c) => c.id);

  let typeFilter;
  if (direction === "in") typeFilter = { in: INCOME_TYPES };
  if (direction === "out") typeFilter = { in: OUTFLOW_TYPES };
  if (direction === "transfer") typeFilter = { in: TRANSFER_TYPES };

  const where = {
    caisseId: { in: caisseIds },
    ...(typeFilter && { transactionType: typeFilter }),
    ...buildDateFilter(dateFrom, dateTo),
  };

  const [transactions, total, encaissements, decaissements, transferIn, transferOut, soldeFinalData] = await Promise.all([
    prisma.caisseTransaction.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        caisse: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                id: true,
                name: true,
                role: { select: { name: true } },
              },
            },
          },
        },
        label: { select: { id: true, name: true } },
        referenceCaisse: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.caisseTransaction.count({ where }),
    prisma.caisseTransaction.aggregate({
      where: {
        caisseId: { in: caisseIds },
        transactionType: { in: INCOME_TYPES },
        ...buildDateFilter(dateFrom, dateTo),
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        caisseId: { in: caisseIds },
        transactionType: { in: OUTFLOW_TYPES },
        ...buildDateFilter(dateFrom, dateTo),
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        caisseId: { in: caisseIds },
        transactionType: "TRANSFER_IN",
        ...buildDateFilter(dateFrom, dateTo),
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        caisseId: { in: caisseIds },
        transactionType: "TRANSFER_OUT",
        ...buildDateFilter(dateFrom, dateTo),
      },
      _sum: { amount: true },
    }),
    prisma.caisse.aggregate({
      where: caisseWhere,
      _sum: { currentBalance: true },
    }),
  ]);

  return {
    data: transactions,
    summary: {
      soldeFinal: parseFloat(soldeFinalData._sum.currentBalance || 0),
      totalEncaissements: parseFloat(encaissements._sum.amount || 0),
      totalDecaissements: Math.abs(parseFloat(decaissements._sum.amount || 0)),
      totalTransfers:
        parseFloat(transferIn._sum.amount || 0) +
        Math.abs(parseFloat(transferOut._sum.amount || 0)),
    },
    pagination: {
      total,
      numberOfPages: Math.ceil(total / parseInt(limit)),
      page: parseInt(page),
      limit: parseInt(limit),
    },
  };
};

// -----------------------------------------------
// DASHBOARD (per-caisse stats)
// -----------------------------------------------

export const getDashboard = async (caisseId, query, currentUser) => {
  const caisse = await getById(caisseId, currentUser);
  const { dateFrom, dateTo } = query;

  const dateFilter = buildDateFilter(dateFrom, dateTo);
  const baseWhere = { caisseId: caisse.id, ...dateFilter };

  const [entrees, sorties, transferIn, transferOut] = await Promise.all([
    prisma.caisseTransaction.aggregate({
      where: {
        ...baseWhere,
        transactionType: { in: INCOME_TYPES },
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        ...baseWhere,
        transactionType: { in: OUTFLOW_TYPES },
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        ...baseWhere,
        transactionType: "TRANSFER_IN",
      },
      _sum: { amount: true },
    }),
    prisma.caisseTransaction.aggregate({
      where: {
        ...baseWhere,
        transactionType: "TRANSFER_OUT",
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    caisse,
    stats: {
      currentBalance: parseFloat(caisse.currentBalance),
      totalEntrees: parseFloat(entrees._sum.amount || 0),
      totalSorties: Math.abs(parseFloat(sorties._sum.amount || 0)),
      totalTransfers:
        parseFloat(transferIn._sum.amount || 0) +
        Math.abs(parseFloat(transferOut._sum.amount || 0)),
    },
  };
};

// -----------------------------------------------
// UTILITY
// -----------------------------------------------

function buildDateFilter(dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return {};
  return {
    createdAt: {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    },
  };
}
