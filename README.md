# HEX EVENT — Dashboard de producción
> The Omen Records × Melt Underground

App de gestión de eventos con estado persistente vía Firebase Firestore.
Todos los que abran la URL ven y editan el mismo estado en tiempo real.

---

## Setup en 5 pasos

### 1. Cloná el repo e instalá dependencias
```bash
git clone https://github.com/tu-usuario/hex-event.git
cd hex-event
npm install
```

### 2. Creá un proyecto en Firebase
1. Ir a https://console.firebase.google.com
2. **"Add project"** → nombre: `hex-event` → continuar
3. Deshabilitar Google Analytics (no es necesario) → crear proyecto
4. En el dashboard del proyecto: **"Add app"** → ícono Web `</>`
5. Nombre: `hex-event-web` → registrar
6. Copiá las credenciales que aparecen (`firebaseConfig`)

### 3. Crear la base de datos Firestore
1. En Firebase Console → **Build → Firestore Database**
2. **"Create database"** → modo de producción → elegir región (us-east1 o similar)
3. En **Rules**, reemplazá el contenido con:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      // Solo lectura/escritura desde tu dominio (ajustá si querés más restricciones)
      allow read, write: if true;
    }
  }
}
```
4. Publicar las reglas.

### 4. Configurá las variables de entorno
```bash
cp .env.example .env
```
Abrí `.env` y completá con tus credenciales de Firebase:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=hex-event-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hex-event-xxx
VITE_FIREBASE_STORAGE_BUCKET=hex-event-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5. Corré en local
```bash
npm run dev
```
Abrí http://localhost:5173 — los cambios se guardan solos en Firestore.

---

## Deploy en GitHub Pages

### Opción A: GitHub Pages con gh-pages
```bash
npm install -D gh-pages
```

Agregá en `package.json` → `scripts`:
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```

Si el repo se llama `hex-event` (no es el dominio raíz), cambiá en `vite.config.js`:
```js
base: '/hex-event/',
```

Luego:
```bash
npm run deploy
```
La URL va a ser: `https://tu-usuario.github.io/hex-event/`

**Importante:** Las variables `.env` no se suben a GitHub.
Para GitHub Pages necesitás agregarlas como **Secrets** del repo:
- Settings → Secrets and variables → Actions → New repository secret
- Agregar cada `VITE_*` como secret
- Crear `.github/workflows/deploy.yml` (ver abajo)

### Workflow para GitHub Actions
Creá `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Opción B: Vercel (más fácil)
```bash
npm install -D vercel
npx vercel
```
Las variables de entorno se configuran directo en el dashboard de Vercel.

---

## Estructura del proyecto
```
hex-event/
├── src/
│   ├── App.jsx          # Componente principal
│   ├── firebase.js      # Inicialización Firebase
│   └── main.jsx         # Entry point
├── .env                 # Variables de entorno (NO commitear)
├── .env.example         # Template de variables
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## Cómo funciona la persistencia
- Al abrir la app, se suscribe a `Firestore → events/hex-event-1` en tiempo real
- Cada cambio se guarda con 800ms de debounce (espera que pares de escribir)
- El badge en el header muestra el estado: **guardado / guardando... / error**
- Si dos personas abren la app al mismo tiempo, los cambios de uno se reflejan en el otro automáticamente
