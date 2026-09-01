import multer from "multer";
import ApiError from "../utils/apiError.js";

const multerOptions = () => {
  // 1-DiskStorage engine
  // const multerStorage = multer.diskStorage({
  //   destination: function (req, file, cb) {
  //     cb(null, "uploads/categories");
  //   },
  //   filename: function (req, file, cb) {
  //     const ext = file.mimetype.split("/")[1];
  //     const filename = `category-${uuidv4()}-${Date.now()}.${ext}`;
  //     cb(null, filename);
  //   },
  // });

  // 2-MemoryStorage engine
  const multerStorage = multer.memoryStorage();

  const multerFilter = function (req, file, cb) {
    if (file.mimetype.startsWith("image")) {
      cb(null, true);
    } else {
      cb(new ApiError("only images allowed", 400), false);
    }
  };

  const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
  return upload;
};

export const uploadSingleImage = (fieldName) =>
  multerOptions().single(fieldName);

export const uploadMixOfImages = (arrayOfFields) =>
  multerOptions().fields(arrayOfFields);
