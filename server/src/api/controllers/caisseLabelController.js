import * as caisseLabelService from "../services/caisseLabelService.js";

export const createLabel = async (req, res) => {
  const label = await caisseLabelService.create(req.body);
  res.status(201).json({ status: "success", data: label });
};

export const getAllLabels = async (req, res) => {
  const result = await caisseLabelService.getAll(req.query);
  res.json({ status: "success", ...result });
};

export const getLabelById = async (req, res) => {
  const label = await caisseLabelService.getById(req.params.id);
  res.json({ status: "success", data: label });
};

export const updateLabel = async (req, res) => {
  const label = await caisseLabelService.update(req.params.id, req.body);
  res.json({ status: "success", data: label });
};

export const deleteLabel = async (req, res) => {
  await caisseLabelService.remove(req.params.id);
  res.json({ status: "success", message: "Libellé supprimé avec succès" });
};
