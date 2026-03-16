#!/usr/bin/env node
/**
 * Genera un hash bcrypt para usar como ADMIN_PASSWORD_HASH en el .env
 * Uso: node scripts/generate-hash.js tuContraseña
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("❌ Uso: node scripts/generate-hash.js pass");
  process.exit(1);
}

async function main() {
  const hash = await bcrypt.hash(password, 10);
  console.log("\n Hash generado:");
  console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`);
  console.log("→ Copia esta línea en tu archivo .env\n");
}

main();
