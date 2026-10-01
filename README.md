# Portfolio — Gianfranco Di Pisa Echague

Sitio web estático con hoja de vida, galería de experiencias y agenda de
servicios (consultas privadas entre cliente y proveedor).

## Stack

- HTML / CSS / JavaScript (sin framework)
- Firebase Auth (email + contraseña)
- Cloud Firestore (consultas, mensajes, testimonios)
- Firebase Hosting

## Estructura

```
index.html          Hoja de vida (principal)
experiencias.html   Galería de fotos/videos
blog.html           Agenda de servicios (consultas)
css/style.css       Estilos
js/ui.js            Navegación y utilidades de UI
js/data.js          Datos del CV (experiencia, educación, habilidades)
js/blog.js          Lógica del blog/consultas
js/firebase-config.js        Config real (NO se sube al repo, está en .gitignore)
js/firebase-config.example.js  Plantilla de configuración
firestore.rules    Reglas de seguridad de Firestore
firestore.indexes.json  Índices compuestos
firebase.json       Config de hosting y despliegue
```

## Puesta en marcha

```bash
npm install
npm start
```

Abre `http://localhost:3000`.

## Configurar Firebase

1. Copiá la plantilla y pegá tu configuración real:

   ```bash
   cp js/firebase-config.example.js js/firebase-config.js
   ```

2. Editá `js/firebase-config.js` con los datos de Firebase Console
   (Project settings → General → Your apps → Web app).

3. Activá el método de acceso **Email/Password** en
   Firebase Console → Authentication → Sign-in method.

4. Poné tu email en `ADMIN_EMAILS` dentro de `js/firebase-config.js`.
   Solo ese email accede al panel de administración.

## Desplegar

```bash
firebase login
firebase deploy
```

El sitio queda publicado en `https://<tu-proyecto>.web.app`.

## Seguridad

- `firestore.rules` es la autoridad real de permisos (no el frontend).
- Solo el email definido en `ADMIN_EMAILS` (validado en el servidor) accede
  al panel de administrador.
- Las consultas privadas se filtran **en el servidor** por `clientUid`.
- Los datos reales de Firebase no se suben al repositorio.

## Palabras clave (modo voz)

Decí **"WASAUSKI OPCIONES"** para abrir el menú de opciones.