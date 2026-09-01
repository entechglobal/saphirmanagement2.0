import { getPublicBaseUrl } from "../../utils/network.js";

export const buildImageUrl = (folder, filename) => {
  if (!filename) return null;
  return `${getPublicBaseUrl()}/uploads/${folder}/${filename}`;
};
