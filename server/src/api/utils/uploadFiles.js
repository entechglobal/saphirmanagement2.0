import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });
const uploadFile = upload.single("file");
export default uploadFile;
