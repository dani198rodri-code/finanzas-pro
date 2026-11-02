# Finanzas Pro
## Generar el APK (sin instalar nada)
1. Crea un repositorio en github.com y sube el contenido de esta carpeta (incluida `.github`).
2. Ve a **Actions → Build APK → Run workflow** (se ejecuta solo al subir).
3. Al terminar (~5 min), descarga el artefacto **FinanzasPro-APK** → `app-debug.apk`.
4. Pásalo al celular, ábrelo y permite "instalar apps desconocidas".
## Alternativa con Android Studio
`npm install && npx cap add android && npx cap sync android` y luego Build > Build APK.
## Usar sin APK
Abre `www/index.html` publicado en cualquier hosting https y usa "Añadir a pantalla de inicio".
