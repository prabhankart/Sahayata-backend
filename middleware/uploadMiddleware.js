import multer from "multer";
import path from "path";
import fs from "fs";

// make sure uploads folder exists
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // save inside /uploads folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // eg: 1693443233-123.png
  },
});

// file filter (only images)
function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|gif/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
});

export default upload;
