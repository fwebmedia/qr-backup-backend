const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../middleware/auth");
const {
  uploadImage,
  listImages,
  getImage,
  deleteImage,
  getStats,
} = require("../controllers/imagesController");

// Multer: almacenar en memoria (buffer) antes de subir a Firebase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido. Solo imágenes."));
    }
  },
});

// ── Rutas públicas (para que el formulario QR pueda subir sin login) ──
// NOTA: Puedes agregar authMiddleware aquí si el formulario QR tiene token
router.post("/upload", upload.single("image"), uploadImage);

// ── Rutas protegidas (panel admin) ──
router.get("/stats", authMiddleware, getStats);
router.get("/", authMiddleware, listImages);
router.get("/:id", authMiddleware, getImage);
router.delete("/:id", authMiddleware, deleteImage);

module.exports = router;
