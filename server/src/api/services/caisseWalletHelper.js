import ApiError from "../utils/apiError.js";

const BANK_MODES = ["CARTE_BANCAIRE", "VIREMENT", "CHEQUE", "EFFET"];
const CASH_MODES = ["ESPECE", "ESPECES"];
const PERSONAL_CAISSE_TYPES = ["USER"];

const CAISSE_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
    },
  },
  societe: { select: { id: true, raisonSocial: true } },
  banque: { select: { id: true, name: true, RIB: true } },
};

export { CAISSE_INCLUDE };

async function resolveUserWallet(tx, { societeId, userId }) {
  if (!userId) {
    throw new ApiError(
      "Impossible de traiter des espèces sans utilisateur connecté.",
      400,
    );
  }

  const userWallet = await tx.caisse.findUnique({
    where: { userId: parseInt(userId) },
  });

  if (!userWallet || !userWallet.active) {
    throw new ApiError(
      "Vous n'avez pas de wallet actif. Créez votre wallet pour enregistrer les espèces.",
      400,
    );
  }

  if (!PERSONAL_CAISSE_TYPES.includes(userWallet.caisseType)) {
    throw new ApiError(
      "Le wallet associé à votre compte ne peut pas enregistrer des espèces.",
      400,
    );
  }

  if (societeId && userWallet.societeId && userWallet.societeId !== societeId) {
    throw new ApiError(
      "Le wallet utilisateur n'appartient pas à cette société.",
      403,
    );
  }

  return userWallet;
}

export async function resolveWalletForIncome(tx, {
  societeId,
  modeReglement,
  banqueId,
  caisseId,
  userId,
}) {
  if (caisseId) {
    const caisse = await tx.caisse.findFirst({
      where: {
        id: parseInt(caisseId),
        societeId,
        active: true,
      },
    });
    if (!caisse) {
      throw new ApiError("Wallet destination introuvable ou inactif", 404);
    }
    return caisse;
  }

  if (CASH_MODES.includes(modeReglement)) {
    return resolveUserWallet(tx, { societeId, userId });
  }

  if (BANK_MODES.includes(modeReglement)) {
    if (banqueId) {
      const bankWallet = await tx.caisse.findFirst({
        where: {
          societeId,
          banqueId: parseInt(banqueId),
          caisseType: "BANK",
          active: true,
        },
      });
      if (!bankWallet) {
        throw new ApiError(
          "Aucun wallet banque actif pour cette banque. Créez-le dans la gestion des wallets.",
          400,
        );
      }
      return bankWallet;
    }

    // Chèque/Effet sans banque → caisse par défaut
    const caisseWallet = await tx.caisse.findFirst({
      where: { societeId, caisseType: "CAISSE", active: true },
      orderBy: { createdAt: "asc" },
    });
    if (caisseWallet) return caisseWallet;

    throw new ApiError(
      `Aucun wallet disponible pour le mode ${modeReglement}. Créez un wallet banque ou caisse.`,
      400,
    );
  }

  return null;
}

export async function resolveWalletForExpense(tx, {
  societeId,
  modeReglement,
  banqueId,
  caisseId,
  userId,
}) {
  return resolveWalletForIncome(tx, {
    societeId,
    modeReglement,
    banqueId,
    caisseId,
    userId,
  });
}

export async function creditWallet(tx, {
  caisse,
  amount,
  note,
  createdBy,
  reglementClientId,
}) {
  const creditAmount = parseFloat(amount);
  if (!caisse || creditAmount <= 0) return null;

  const currentBalance = parseFloat(caisse.currentBalance);
  const newBalance = parseFloat((currentBalance + creditAmount).toFixed(2));

  await tx.caisse.update({
    where: { id: caisse.id },
    data: { currentBalance: newBalance },
  });

  return tx.caisseTransaction.create({
    data: {
      caisseId: caisse.id,
      transactionType: "INCOME",
      amount: creditAmount,
      oldBalance: currentBalance,
      newBalance,
      note: note || null,
      reglementClientId: reglementClientId ?? null,
      createdBy: createdBy ?? null,
    },
  });
}

export async function debitWallet(tx, {
  caisse,
  amount,
  note,
  createdBy,
  reglementFournisseurId,
}) {
  const debitAmount = parseFloat(amount);
  if (!caisse || debitAmount <= 0) return null;

  const currentBalance = parseFloat(caisse.currentBalance);
  if (debitAmount > currentBalance) {
    throw new ApiError(
      `Solde insuffisant dans « ${caisse.name} ». Solde actuel: ${currentBalance.toFixed(2)} MAD`,
      400,
    );
  }

  const newBalance = parseFloat((currentBalance - debitAmount).toFixed(2));

  await tx.caisse.update({
    where: { id: caisse.id },
    data: { currentBalance: newBalance },
  });

  return tx.caisseTransaction.create({
    data: {
      caisseId: caisse.id,
      transactionType: "EXPENSE",
      amount: -debitAmount,
      oldBalance: currentBalance,
      newBalance,
      note: note || null,
      reglementFournisseurId: reglementFournisseurId ?? null,
      createdBy: createdBy ?? null,
    },
  });
}

export async function reverseIncome(tx, reglementClientId) {
  const txRows = await tx.caisseTransaction.findMany({
    where: { reglementClientId, transactionType: "INCOME" },
  });

  for (const row of txRows) {
    const caisse = await tx.caisse.findUnique({ where: { id: row.caisseId } });
    if (!caisse) continue;

    const amount = Math.abs(parseFloat(row.amount));
    const currentBalance = parseFloat(caisse.currentBalance);
    const newBalance = parseFloat((currentBalance - amount).toFixed(2));

    await tx.caisse.update({
      where: { id: caisse.id },
      data: { currentBalance: newBalance },
    });
    await tx.caisseTransaction.delete({ where: { id: row.id } });
  }
}

export async function reverseExpense(tx, reglementFournisseurId) {
  const txRows = await tx.caisseTransaction.findMany({
    where: { reglementFournisseurId, transactionType: "EXPENSE" },
  });

  for (const row of txRows) {
    const caisse = await tx.caisse.findUnique({ where: { id: row.caisseId } });
    if (!caisse) continue;

    const amount = Math.abs(parseFloat(row.amount));
    const currentBalance = parseFloat(caisse.currentBalance);
    const newBalance = parseFloat((currentBalance + amount).toFixed(2));

    await tx.caisse.update({
      where: { id: caisse.id },
      data: { currentBalance: newBalance },
    });
    await tx.caisseTransaction.delete({ where: { id: row.id } });
  }
}

export const INCOME_TYPES = ["INITIAL_BALANCE", "INCOME"];
export const OUTFLOW_TYPES = ["CHARGE", "EXPENSE"];
export const TRANSFER_TYPES = ["TRANSFER_IN", "TRANSFER_OUT"];
