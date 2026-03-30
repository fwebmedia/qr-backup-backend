# QR Backup Backend

Backend Express.js para respaldo de imágenes generadas.

Almacena imágenes en **Firebase Storage** y metadata en **Firestore**, con autenticación JWT y panel de administración web.

---

## 🚀 Instalación rápida

```bash
git clone <tu-repo>
cd qr-backup-backend
npm install
cp .env.example .env
```

---

## 🔧 Configuración

### 1. Firebase — Service Account

1. Ve a [Firebase Console](https://console.firebase.google.com/) → tu proyecto
2. **Configuración del proyecto** → **Cuentas de servicio**
3. Haz clic en **"Generar nueva clave privada"** → descarga el JSON
4. Copia los valores al `.env`:

```env
FIREBASE_PROJECT_ID=mi-proyecto
FIREBASE_PRIVATE_KEY_ID=abc123
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@mi-proyecto.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
FIREBASE_STORAGE_BUCKET=mi-proyecto.appspot.com
```

> La `FIREBASE_PRIVATE_KEY` debe tener los saltos de línea como `\n` literal dentro de comillas dobles.

### 2. Firebase Storage — Reglas

En Firebase Console → Storage → Reglas, pon:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /qr-backups/{allPaths=**} {
      allow read: if true;          // público para ver imágenes
      allow write: if false;        // solo via Admin SDK (backend)
    }
  }
}
```

### 3. Contraseña de administrador

```bash
node scripts/generate-hash.js TuContraseñaSegura
```

Copia el hash al `.env`:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2a$10$...hash_generado...
```

### 4. JWT Secret

Genera una clave aleatoria fuerte:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```env
JWT_SECRET=tu_clave_aleatoria_aqui
```

### 5. CORS — Orígenes permitidos

```env
ALLOWED_ORIGINS=https://tuweb.com,http://localhost:3000
```

---

## ▶️ Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor corre en `http://localhost:3000`

---

## 🌐 Panel de administración

Visita `http://localhost:3000/dashboard`

- Login con usuario y contraseña
- Vista de todas las imágenes respaldadas
- Estadísticas de uso
- Eliminación de imágenes

---

## 📡 API REST

### Autenticación

#### POST /api/auth/login
```json
// Body
{ "username": "admin", "password": "tuPassword" }

// Respuesta
{ "token": "eyJ...", "expiresIn": "8h" }
```

### Imágenes

#### POST /api/images/upload
Sube una imagen al respaldo. No requiere autenticación (para que el formulario QR pueda usarla directamente).

```
Content-Type: multipart/form-data

Campos:
- image       (File)    → archivo de imagen [requerido]
- label       (string)  → etiqueta descriptiva
- description (string)  → descripción adicional
- source      (string)  → origen (default: "qr-generator")
```

#### GET /api/images
Lista todas las imágenes (requiere token).

Query params:
- `limit` (default: 20)
- `startAfter` (id del último documento para paginación)
- `source` (filtrar por origen)

#### GET /api/images/:id
Obtiene metadata de una imagen específica.

#### DELETE /api/images/:id
Elimina una imagen de Storage y Firestore.

#### GET /api/images/stats
Estadísticas generales.

---

## 🔗 Integrar con el formulario QR

En el proyecto de `tuweb.com/qr-generator`, al momento de generar la imagen, agrega:

```javascript
async function backupQRImage(imageBlob, label) {
  const formData = new FormData();
  formData.append('image', imageBlob, 'qr-code.png');
  formData.append('label', label);
  formData.append('source', 'qr-generator');

  try {
    const res = await fetch('https://tu-backend.com/api/images/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log('Respaldo guardado:', data.publicUrl);
  } catch (err) {
    console.error('Error al respaldar:', err);
  }
}
```

---

## 🚢 Deploy en Railway / Render / VPS

### Railway
```bash
railway init
railway up
# Agregar variables de entorno en el dashboard de Railway
```

### PM2 (VPS)
```bash
npm install -g pm2
pm2 start src/index.js --name qr-backup
pm2 save
pm2 startup
```

---

## 📁 Estructura del proyecto

```
qr-backup-backend/
├── src/
│   ├── index.js              # Entrada principal Express
│   ├── config/
│   │   └── firebase.js       # Inicialización Firebase Admin SDK
│   ├── middleware/
│   │   └── auth.js           # Middleware JWT
│   ├── controllers/
│   │   ├── authController.js # Login + verificación
│   │   └── imagesController.js # CRUD imágenes
│   └── routes/
│       ├── auth.js
│       └── images.js
├── public/
│   └── dashboard/
│       └── index.html        # Panel de administración
├── scripts/
│   └── generate-hash.js      # Generar hash de contraseña
├── .env.example
├── package.json
└── README.md
```
