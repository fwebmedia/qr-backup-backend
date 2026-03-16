const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuario y contraseña requeridos" });
    }

    // Verificar usuario
    if (username !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Verificar contraseña contra el hash almacenado en .env
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Generar JWT
    const token = jwt.sign(
      { username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      message: "Login exitoso",
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || "8h",
    });
  } catch (err) {
    console.error("Error en login:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

/**
 * GET /api/auth/me  (ruta protegida - verificar token)
 */
function me(req, res) {
  res.json({ username: req.user.username, role: req.user.role });
}

module.exports = { login, me };
