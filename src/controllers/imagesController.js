const { getDb, getBucket } = require("../config/firebase");
const path = require("path");

/**
 * POST /api/images/upload
 * Sube una imagen a Firebase Storage y guarda metadata en Firestore
 * Multipart/form-data con campo "image" + campos opcionales del formulario
 */
async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo" });
    }

    const { originalname, buffer, mimetype, size } = req.file;
    const { label, description, source } = req.body; // datos extra del formulario QR

    const timestamp = Date.now();
    const ext = path.extname(originalname) || ".png";
    const filename = `qr-backups/${timestamp}-${originalname.replace(/\s+/g, "_")}`;

    // ── 1. Subir a Firebase Storage ──────────────────────────
    const bucket = getBucket();
    const file = bucket.file(filename);

    await file.save(buffer, {
      metadata: {
        contentType: mimetype,
        metadata: {
          uploadedFrom: source || "qr-generator",
          label: label || "",
        },
      },
    });

    // Hacer el archivo público y obtener URL
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    // ── 2. Guardar metadata en Firestore ────────────────────
    const db = getDb();
    const docRef = await db.collection("qr_images").add({
      filename,
      originalName: originalname,
      publicUrl,
      mimetype,
      size,
      label: label || "",
      description: description || "",
      source: source || "qr-generator",
      uploadedAt: new Date().toISOString(),
      storagePath: filename,
    });

    res.status(201).json({
      message: "Imagen subida correctamente",
      id: docRef.id,
      publicUrl,
      filename,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error al subir imagen:", err);
    res.status(500).json({ error: "Error al subir la imagen", detail: err.message });
  }
}

/**
 * GET /api/images
 * Lista todas las imágenes con paginación
 * Query params: limit (default 20), startAfter (doc id), source
 */
async function listImages(req, res) {
  try {
    const db = getDb();
    const limit = parseInt(req.query.limit) || 20;
    const { startAfter, source } = req.query;

    let query = db
      .collection("qr_images")
      .orderBy("uploadedAt", "desc")
      .limit(limit);

    if (source) {
      query = query.where("source", "==", source);
    }

    if (startAfter) {
      const lastDoc = await db.collection("qr_images").doc(startAfter).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const images = [];

    snapshot.forEach((doc) => {
      images.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      images,
      count: images.length,
      hasMore: images.length === limit,
      lastId: images.length > 0 ? images[images.length - 1].id : null,
    });
  } catch (err) {
    console.error("Error al listar imágenes:", err);
    res.status(500).json({ error: "Error al obtener imágenes" });
  }
}

/**
 * GET /api/images/:id
 * Obtiene metadata de una imagen específica
 */
async function getImage(req, res) {
  try {
    const db = getDb();
    const doc = await db.collection("qr_images").doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener imagen" });
  }
}

/**
 * DELETE /api/images/:id
 * Elimina imagen de Storage y Firestore
 */
async function deleteImage(req, res) {
  try {
    const db = getDb();
    const bucket = getBucket();

    const doc = await db.collection("qr_images").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    const { storagePath } = doc.data();

    // Eliminar de Storage
    try {
      await bucket.file(storagePath).delete();
    } catch (storageErr) {
      console.warn("Archivo no encontrado en Storage:", storageErr.message);
    }

    // Eliminar de Firestore
    await db.collection("qr_images").doc(req.params.id).delete();

    res.json({ message: "Imagen eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar imagen:", err);
    res.status(500).json({ error: "Error al eliminar imagen" });
  }
}

/**
 * GET /api/images/stats
 * Estadísticas generales
 */
async function getStats(req, res) {
  try {
    const db = getDb();
    const snapshot = await db.collection("qr_images").get();

    let totalSize = 0;
    const bySource = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      totalSize += data.size || 0;
      const src = data.source || "unknown";
      bySource[src] = (bySource[src] || 0) + 1;
    });

    res.json({
      totalImages: snapshot.size,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      bySource,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
}

module.exports = { uploadImage, listImages, getImage, deleteImage, getStats };
