import * as caisseService from "../services/caisseService.js";

export const createCaisse = async (req, res) => {
  const caisse = await caisseService.create(req.body, req.user);
  res.status(201).json({ status: "success", data: caisse });
};

export const getAllCaisses = async (req, res) => {
  const result = await caisseService.getAll(req.query, req.user);
  res.json({ status: "success", ...result });
};

export const createMyCaisse = async (req, res) => {
  const caisse = await caisseService.createMyCaisse(req.body, req.user);
  res.status(201).json({ status: "success", message: "Votre caisse a été créée avec succès", data: caisse });
};

export const getMyCaisse = async (req, res) => {
  const caisse = await caisseService.getMyCaisse(req.user);
  res.json({ status: "success", data: caisse });
};

export const getCaisseById = async (req, res) => {
  const caisse = await caisseService.getById(req.params.id, req.user);
  res.json({ status: "success", data: caisse });
};

export const updateCaisse = async (req, res) => {
  const caisse = await caisseService.update(req.params.id, req.body, req.user);
  res.json({ status: "success", data: caisse });
};

export const deleteCaisse = async (req, res) => {
  await caisseService.remove(req.params.id, req.user);
  res.json({ status: "success", message: "Caisse supprimée avec succès" });
};

export const createCharge = async (req, res) => {
  const transaction = await caisseService.createCharge(req.body, req.user);
  res.status(201).json({ status: "success", data: transaction });
};

export const getTransferableCaisses = async (req, res) => {
  const result = await caisseService.getTransferableCaisses(req.query, req.user);
  res.json({ status: "success", ...result });
};

export const createRetrait = async (req, res) => {
  const result = await caisseService.createRetrait(req.body, req.user);
  res.status(201).json({ status: "success", data: result });
};

export const createDepot = async (req, res) => {
  const result = await caisseService.createDepot(req.body, req.user);
  res.status(201).json({ status: "success", data: result });
};

export const createTransfer = async (req, res) => {
  const result = await caisseService.createTransfer(req.body, req.user);
  res.status(201).json({ status: "success", data: result });
};

export const createBankWallet = async (req, res) => {
  const caisse = await caisseService.createBankWallet(req.body, req.user);
  res.status(201).json({ status: "success", data: caisse });
};

export const createCoffreWallet = async (req, res) => {
  const caisse = await caisseService.createCoffreWallet(req.body, req.user);
  res.status(201).json({ status: "success", data: caisse });
};

export const getTransactions = async (req, res) => {
  const result = await caisseService.getTransactions(
    req.params.id,
    req.query,
    req.user
  );
  res.json({ status: "success", ...result });
};

export const getAllTransactions = async (req, res) => {
  const result = await caisseService.getAllTransactions(req.query, req.user);
  res.json({ status: "success", ...result });
};

export const getDashboard = async (req, res) => {
  const result = await caisseService.getDashboard(
    req.params.id,
    req.query,
    req.user
  );
  res.json({ status: "success", data: result });
};
