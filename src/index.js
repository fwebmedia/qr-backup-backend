require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { initFirebase } = require("./config/firebase");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Inicializar Firebase ──────────────────────────────────────────────
initFirebase();

// ── CORS ──────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, curl) o dominios en la lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origen no permitido → ${origin}`));
      }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: { error: "Demasiados intentos de login. Intenta en 15 minutos." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  message: { error: "Límite de subidas alcanzado. Espera un momento." },
});

// ── Body parsers ──────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Panel de administración (HTML estático) ───────────────────────────
app.use(express.static(path.join(__dirname, "../public")));

// ── Rutas API ─────────────────────────────────────────────────────────
app.use("/api/auth", loginLimiter, require("./routes/auth"));
app.use("/api/images", uploadLimiter, require("./routes/images"));

// ── Health check ──────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── SPA fallback: panel admin ─────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard/index.html"));
});

// ── Error handler global ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  if (err.message.includes("CORS")) {
    return res.status(403).json({ error: err.message });
  }
  if (err.message.includes("archivo")) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Error interno del servidor" });
});

// ── Iniciar servidor ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Panel admin: http://localhost:${PORT}/dashboard`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || "development"}\n`);
});
