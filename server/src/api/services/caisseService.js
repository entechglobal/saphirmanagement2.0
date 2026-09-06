import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import {
  CAISSE_INCLUDE,
  INCOME_TYPES,
  OUTFLOW_TYPES,
  TRANSFER_TYPES,
} from "./caisseWalletHelper.js";
import { createNotifications } from "./notificationService.js";

// -----------------------------------------------
// HELPERS
// -----------------------------------------------

const SUPER_ADMIN_ROLES = ["Super_Admin", "SUPERADMIN"];

const isInstitutionalWallet = (caisse) =>
  caisse.caisseType === "BANK" || caisse.caisseType === "CAISSE";

const isSuperAdminUser = (user) =>
  !!user?.isSuperAdmin || SUPER_ADMIN_ROLES.includes(user?.roleName);

const TRANSFER_REQUEST_INCLUDE = {
  sourceCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true } },
    },
  },
  destinationCaisse: {
    select: {
      id: true,
      name: true,
      caisseType: true,
      userId: true,
      user: { select: { id: true, name: true } },
      banque: { select: { id: true, name: true } },
    },
  },
  createdBy: { select: { id: true, name: true } },
  respondedBy: { select: { id: true, name: true } },
};

const walletDisplayName = (caisse) => {
  if (!caisse) return "";
  if (caisse.caisseType === "BANK") return caisse.banque?.name || caisse.name;
  if (caisse.caisseType === "CAISSE") return caisse.name;
  return caisse.user?.name || caisse.name;
};

const getPendingOutgoingAmount = async (caisseId, db = prisma) => {
  const agg = await db.caisseTransferRequest.aggregate({
    where: { sourceCaisseId: caisseId, status: "PENDING" },
    _sum: { amount: true },
  });
  return parseFloat(agg._sum.amount || 0);
};

const attachAvailableBalances = async (caisses) => {
  if (!caisses.length) return caisses;
  const ids = caisses.map((c) => c.id);
  const pending = await prisma.caisseTransferRequest.groupBy({
    by: ["sourceCaisseId"],
    where: { sourceCaisseId: { in: ids }, status: "PENDING" },
    _sum: { amount: true },
  });
  const map = new Map(
    pending.map((p) => [p.sourceCaisseId, parseFloat(p._sum.amount || 0)])
  );
  return caisses.map((c) => {
    const pendingOutgoing = map.get(c.id) || 0;
    return {
      ...c,
      pendingOutgoing,
      availableBalance: parseFloat(
        (parseFloat(c.currentBalance) - pendingOutgoing).toFixed(2)
      ),
    };
  });
};

const attachAvailableBalance = async (caisse) => {
  if (!caisse) return caisse;
  const [withBalance] = await attachAvailableBalances([caisse]);
  return withBalance;
};

const getSuperAdminIds = async () => {
  const users = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { isSuperAdmin: true },
        { role: { name: { in: SUPER_ADMIN_ROLES } } },
      ],
    },
    select: { id: true },
  });
  return [...new Set(users.map((u) => u.id))];
};

const requiresSuperAdminApproval = (destinationCaisse) =>
  isInstitutionalWallet(destinationCaisse);

/** Only instant when sending to your own user wallet — everything else waits for accept. */
const canAutoCompleteTransfer = (destinationCaisse, currentUser) => {
  if (requiresSuperAdminApproval(destinationCaisse)) return false;
  return destinationCaisse.userId === currentUser.id;
};

const resolveApproverUserIds = async (destinationCaisse) => {
  if (requiresSuperAdminApproval(destinationCaisse)) {
    const ids = await getSuperAdminIds();
    if (!ids.length) {
      throw new ApiError(
        "Aucun super administrateur disponible pour valider ce transfert",
        400
      );
    }
    return ids;
  }
  if (!destinationCaisse.userId) {
    throw new ApiError(
      "Ce wallet n'a pas de destinataire pouvant accepter le transfert",
      400
    );
  }
  return [destinationCaisse.userId];
};

const assertCanRespondToTransfer = (request, destinationCaisse, currentUser) => {
  if (request.status !== "PENDING") {
    throw new ApiError("Cette demande a déjà été traitée", 400);
  }
  if (requiresSuperAdminApproval(destinationCaisse)) {
    if (!isSuperAdminUser(currentUser)) {
      throw new ApiError(
        "Seul un super administrateur peut valider ce transfert",
        403
      );
    }
    return;
  }
  if (destinationCaisse.userId !== currentUser.id) {
    throw new ApiError("Vous n'êtes pas le destinataire de ce transfert", 403);
  }
};

const buildTransferPayload = (
  sourceCaisse,
  destinationCaisse,
  amount,
  currentUser,
  extra = {}
) => ({
  amount: parseFloat(amount),
  sourceName: walletDisplayName(sourceCaisse),
  destinationName: walletDisplayName(destinationCaisse),
  senderName: currentUser.name,
  senderId: currentUser.id,
  destinationType: destinationCaisse.caisseType,
  requiresSuperAdmin: requiresSuperAdminApproval(destinationCaisse),
  ...extra,
});

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

  if (caisseType === "CAISSE") {
    const walletName = name?.trim() || "Caisse";
    return prisma.$transaction(async (tx) => {
      const caisse = await tx.caisse.create({
        data: {
          societeId: targetSocieteId,
          caisseType: "CAISSE",
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
  createInstitutionalWallet(data, currentUser, "CAISSE");

function generateCaisseName(targetUser) {
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

  const societeId = targetUser.societeId || null;
  const balance = parseFloat(initialBalance) || 0;
  const name = generateCaisseName(targetUser);

  return prisma.$transaction(async (tx) => {
    const caisse = await tx.caisse.create({
      data: {
        userId: parseInt(userId),
        societeId,
        caisseType: "USER",
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
    data: await attachAvailableBalances(caisses),
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
  const existing = await prisma.caisse.findUnique({
    where: { userId: currentUser.id },
    include: CAISSE_INCLUDE,
  });
  if (existing) return attachAvailableBalance(existing);

  if (!currentUser.isSuperAdmin) return null;

  const created = await prisma.caisse.create({
    data: {
      userId: currentUser.id,
      societeId: currentUser.societeId || null,
      caisseType: "USER",
      name: generateCaisseName(currentUser),
      initialBalance: 0,
      currentBalance: 0,
      active: true,
    },
    include: CAISSE_INCLUDE,
  });
  return attachAvailableBalance(created);
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

  return attachAvailableBalance(caisse);
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
  const pendingOutgoing = await getPendingOutgoingAmount(caisse.id);
  const available = parseFloat((currentBalance - pendingOutgoing).toFixed(2));
  if (chargeAmount > available) {
    throw new ApiError(
      `Solde insuffisant. Solde disponible: ${available.toFixed(2)} MAD`,
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
  const { societeId, search, page = 1, limit = 500, excludeCaisseId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const and = [{ active: true }];

  if (currentUser.isSuperAdmin) {
    if (societeId) {
      and.push({ societeId: parseInt(societeId) });
    }
  } else {
    if (!currentUser.societeId) {
      throw new ApiError("Aucune société associée à votre compte", 400);
    }
    and.push({ societeId: currentUser.societeId });
  }

  if (excludeCaisseId) {
    and.push({ id: { not: parseInt(excludeCaisseId) } });
  }

  if (search) {
    and.push({
      OR: [
        { name: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { banque: { name: { contains: search } } },
        { societe: { raisonSocial: { contains: search } } },
      ],
    });
  }

  const where = { AND: and };
  const TYPE_ORDER = ["USER", "BANK", "CAISSE"];

  const [caisses, total] = await Promise.all([
    prisma.caisse.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: CAISSE_INCLUDE,
      orderBy: [{ name: "asc" }],
    }),
    prisma.caisse.count({ where }),
  ]);

  const sorted = [...caisses].sort((a, b) => {
    const ai = TYPE_ORDER.indexOf(a.caisseType);
    const bi = TYPE_ORDER.indexOf(b.caisseType);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    const an = walletDisplayName(a).toLowerCase();
    const bn = walletDisplayName(b).toLowerCase();
    return an.localeCompare(bn, "fr");
  });

  return {
    data: await attachAvailableBalances(sorted),
    pagination: { total, page: parseInt(page), limit: parseInt(limit) },
  };
};

// -----------------------------------------------
// TRANSFER (internal — used by retrait and depot)
// -----------------------------------------------

const applyTransfer = async (
  tx,
  sourceCaisse,
  destinationCaisse,
  amount,
  note,
  currentUser
) => {
  const transferAmount = parseFloat(amount);
  const freshSource = await tx.caisse.findUnique({
    where: { id: sourceCaisse.id },
  });
  const freshDest = await tx.caisse.findUnique({
    where: { id: destinationCaisse.id },
  });
  if (!freshSource || !freshDest) {
    throw new ApiError("Caisse introuvable", 404);
  }

  const sourceBalance = parseFloat(freshSource.currentBalance);
  if (transferAmount > sourceBalance) {
    throw new ApiError(
      `Solde insuffisant dans la caisse source. Solde actuel: ${sourceBalance.toFixed(2)} MAD`,
      400
    );
  }

  const sourceNewBalance = parseFloat(
    (sourceBalance - transferAmount).toFixed(2)
  );
  const destCurrentBalance = parseFloat(freshDest.currentBalance);
  const destNewBalance = parseFloat(
    (destCurrentBalance + transferAmount).toFixed(2)
  );

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
};

const executeTransfer = async (
  sourceCaisse,
  destinationCaisse,
  amount,
  note,
  currentUser
) => {
  const transferAmount = parseFloat(amount);
  const pendingOutgoing = await getPendingOutgoingAmount(sourceCaisse.id);
  const available = parseFloat(
    (parseFloat(sourceCaisse.currentBalance) - pendingOutgoing).toFixed(2)
  );
  if (transferAmount > available) {
    throw new ApiError(
      `Solde insuffisant dans la caisse source. Solde disponible: ${available.toFixed(2)} MAD`,
      400
    );
  }

  return prisma.$transaction((tx) =>
    applyTransfer(tx, sourceCaisse, destinationCaisse, amount, note, currentUser)
  );
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

  const transferAmount = parseFloat(amount);
  const pendingOutgoing = await getPendingOutgoingAmount(sourceCaisse.id);
  const available = parseFloat(
    (parseFloat(sourceCaisse.currentBalance) - pendingOutgoing).toFixed(2)
  );
  if (transferAmount > available) {
    throw new ApiError(
      `Solde insuffisant. Solde disponible: ${available.toFixed(2)} MAD`,
      400
    );
  }

  if (canAutoCompleteTransfer(destinationCaisse, currentUser)) {
    const result = await executeTransfer(
      sourceCaisse,
      destinationCaisse,
      amount,
      note,
      currentUser
    );
    return { pending: false, ...result };
  }

  const requiresSuperAdmin = requiresSuperAdminApproval(destinationCaisse);
  const approverIds = await resolveApproverUserIds(destinationCaisse);
  // Always notify approvers — balance is only moved on accept, never on create.
  const notifyIds = [...new Set(approverIds)];

  const transferRequest = await prisma.$transaction(async (tx) => {
    const created = await tx.caisseTransferRequest.create({
      data: {
        sourceCaisseId: sourceCaisse.id,
        destinationCaisseId: destinationCaisse.id,
        amount: transferAmount,
        note: note || null,
        requiresSuperAdmin,
        createdById: currentUser.id,
      },
      include: TRANSFER_REQUEST_INCLUDE,
    });

    await createNotifications(tx, {
      userIds: notifyIds,
      type: "WALLET_TRANSFER_REQUEST",
      payload: buildTransferPayload(
        sourceCaisse,
        destinationCaisse,
        transferAmount,
        currentUser,
        { note: note || null }
      ),
      transferRequestId: created.id,
    });

    return created;
  });

  return { pending: true, transferRequest };
};

export const acceptTransferRequest = async (id, currentUser) => {
  const request = await prisma.caisseTransferRequest.findUnique({
    where: { id: parseInt(id) },
    include: {
      sourceCaisse: { include: CAISSE_INCLUDE },
      destinationCaisse: { include: CAISSE_INCLUDE },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!request) throw new ApiError("Demande de transfert introuvable", 404);
  if (!request.sourceCaisse?.active) {
    throw new ApiError("La caisse source est désactivée", 400);
  }
  if (!request.destinationCaisse?.active) {
    throw new ApiError("La caisse destination est désactivée", 400);
  }
  assertCanRespondToTransfer(request, request.destinationCaisse, currentUser);

  const transferAmount = parseFloat(request.amount);
  const pendingOutgoing = await getPendingOutgoingAmount(request.sourceCaisseId);
  const otherPending = parseFloat(
    (pendingOutgoing - transferAmount).toFixed(2)
  );
  const available = parseFloat(
    (parseFloat(request.sourceCaisse.currentBalance) - otherPending).toFixed(2)
  );
  if (transferAmount > available) {
    throw new ApiError(
      `Solde insuffisant sur la caisse source. Disponible: ${available.toFixed(2)} MAD`,
      400
    );
  }

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.caisseTransferRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "ACCEPTED",
        respondedById: currentUser.id,
        respondedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError("Cette demande a déjà été traitée", 400);
    }

    const result = await applyTransfer(
      tx,
      request.sourceCaisse,
      request.destinationCaisse,
      transferAmount,
      request.note,
      { id: request.createdById }
    );

    await tx.notification.updateMany({
      where: {
        transferRequestId: request.id,
        type: "WALLET_TRANSFER_REQUEST",
      },
      data: { read: true },
    });

    await createNotifications(tx, {
      userIds: [request.createdById],
      type: "WALLET_TRANSFER_ACCEPTED",
      payload: buildTransferPayload(
        request.sourceCaisse,
        request.destinationCaisse,
        transferAmount,
        request.createdBy,
        { responderName: currentUser.name, responderId: currentUser.id }
      ),
      transferRequestId: request.id,
    });

    return result;
  });
};

export const declineTransferRequest = async (id, currentUser) => {
  const request = await prisma.caisseTransferRequest.findUnique({
    where: { id: parseInt(id) },
    include: {
      sourceCaisse: { include: CAISSE_INCLUDE },
      destinationCaisse: { include: CAISSE_INCLUDE },
      createdBy: { select: { id: true, name: true } },
    },
  });
  if (!request) throw new ApiError("Demande de transfert introuvable", 404);
  assertCanRespondToTransfer(request, request.destinationCaisse, currentUser);

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.caisseTransferRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: "DECLINED",
        respondedById: currentUser.id,
        respondedAt: new Date(),
      },
    });
    if (claimed.count !== 1) {
      throw new ApiError("Cette demande a déjà été traitée", 400);
    }

    await tx.notification.updateMany({
      where: {
        transferRequestId: request.id,
        type: "WALLET_TRANSFER_REQUEST",
      },
      data: { read: true },
    });

    await createNotifications(tx, {
      userIds: [request.createdById],
      type: "WALLET_TRANSFER_DECLINED",
      payload: buildTransferPayload(
        request.sourceCaisse,
        request.destinationCaisse,
        request.amount,
        request.createdBy,
        { responderName: currentUser.name, responderId: currentUser.id }
      ),
      transferRequestId: request.id,
    });

    return { declined: true, id: request.id };
  });
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
