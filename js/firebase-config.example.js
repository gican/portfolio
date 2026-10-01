// ============================================================
//  PLANTILLA DE CONFIGURACIÓN DE FIREBASE
//  Copiá este archivo como "js/firebase-config.js" y pegá tu
//  configuración real de Firebase Console → Project settings.
//
//  Cómo obtenerla:
//  1. Entrá a https://console.firebase.google.com
//  2. Abrí tu proyecto → ⚙ Project settings → General
//  3. Bajá hasta "Your apps" → Web app (</>)
//  4. Copiá el objeto "firebaseConfig" y pegalo abajo.
//
//  IMPORTANTE: el archivo real (js/firebase-config.js) está en
//  .gitignore y NO se sube al repositorio por seguridad.
// ============================================================

// ===== SETTINGS =====
// Emails administradores (dueño del blog). Varios separados por coma.
// Solo estos emails ven el panel de administración.
var ADMIN_EMAILS = "TU_EMAIL_ADMIN@ejemplo.com";
// ====================

var firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
  measurementId: "G-XXXXXXXXXX",
};

// Detecta si la configuración todavía tiene valores de ejemplo
window.firebaseConfigured = !(
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === "TU_API_KEY" ||
  firebaseConfig.apiKey === "YOUR_API_KEY"
);

var db, auth;

if (firebaseConfigured) {
  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  auth = firebase.auth();
}

var Blog = {
  author: null,

  isAdmin: function () {
    if (!Blog.author) return false;
    var list = (ADMIN_EMAILS || "")
      .split(",")
      .map(function (e) {
        return e.trim().toLowerCase();
      });
    return list.indexOf(Blog.author.email.toLowerCase()) !== -1;
  },

  sortDate: function (ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  },

  isEmpty: function (s) {
    return !s || !String(s).trim();
  },

  escape: function (s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  },

  serverTime: function () {
    return firebase.firestore.FieldValue.serverTimestamp();
  },

  // ====================================================
  //  THREADS (consultas / hilos cliente-admin)
  //
  //  threads/{id}                    -> hilo privado (dueño + admin)
  //  threads/{id}/messages/*         -> mensajes del hilo
  //  public_threads/{id}             -> copia pública (testimonio)
  //  public_threads/{id}/messages/*  -> mensajes públicos
  // ====================================================

  // Admin: todas las consultas. Cliente: solo las suyas. Invitado: solo públicas.
  loadThreads: function (render) {
    if (!firebaseConfigured) return;
    var user = auth.currentUser;
    var isAdmin = Blog.isAdmin();

    var unsubPub = db
      .collection("public_threads")
      .orderBy("updatedAt", "desc")
      .onSnapshot(function (snap) {
        var pubs = [];
        snap.forEach(function (doc) {
          pubs.push({ id: doc.id, type: "public", data: doc.data() });
        });
        loadPrivateThreads(render, isAdmin, user, pubs);
      });
    return unsubPub;
  },

  createThread: function (subject, message) {
    var user = auth.currentUser;
    var ref = db.collection("threads").doc();
    var batch = db.batch();
    batch.set(ref, {
      clientUid: user.uid,
      clientName: user.displayName || user.email,
      clientEmail: user.email,
      subject: subject,
      status: "nueva",
      isPublic: false,
      createdAt: Blog.serverTime(),
      updatedAt: Blog.serverTime(),
    });
    batch.set(ref.collection("messages").doc(), {
      clientUid: user.uid,
      from: "client",
      text: message,
      createdAt: Blog.serverTime(),
    });
    return batch.commit();
  },

  loadMessages: function (threadId, cb) {
    var user = auth.currentUser;
    var ref = db.collection("threads").doc(threadId).collection("messages");
    if (user && !Blog.isAdmin()) {
      ref = ref.where("clientUid", "==", user.uid);
    }
    return ref.orderBy("createdAt", "asc").onSnapshot(cb);
  },

  loadPublicMessages: function (threadId, cb) {
    return db
      .collection("public_threads")
      .doc(threadId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot(cb);
  },

  addMessage: function (threadId, from, text) {
    var user = auth.currentUser;
    var threadRef = db.collection("threads").doc(threadId);
    return threadRef.get().then(function (doc) {
      var ownerUid = (doc.exists && doc.data().clientUid) || (user ? user.uid : null);
      return threadRef
        .collection("messages")
        .add({
          clientUid: ownerUid,
          from: from,
          text: text,
          createdAt: Blog.serverTime(),
        })
        .then(function () {
          var patch = { updatedAt: Blog.serverTime() };
          if (from === "admin") patch.status = "en_proceso";
          return threadRef.update(patch);
        });
    });
  },

  setThreadState: function (threadId, patch) {
    if (patch.isPublic === true) return makePublic(threadId);
    if (patch.isPublic === false)
      return db.collection("public_threads").doc(threadId).delete();
    if (patch.status !== undefined)
      return db.collection("threads").doc(threadId).update({ status: patch.status });
    return Promise.resolve();
  },
};

function makePublic(threadId) {
  var ref = db.collection("threads").doc(threadId);
  return ref
    .get()
    .then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data();
      var pubRef = db.collection("public_threads").doc(threadId);
      var batch = db.batch();
      batch.set(pubRef, {
        subject: d.subject,
        clientName: d.clientName || "Cliente",
        updatedAt: Blog.serverTime(),
      });
      return ref
        .collection("messages")
        .get()
        .then(function (msnap) {
          msnap.forEach(function (m) {
            batch.set(pubRef.collection("messages").doc(), m.data());
          });
          return batch.commit();
        });
    });
}

function loadPrivateThreads(render, isAdmin, user, publicList) {
  var ref = db.collection("threads");
  var query = ref.orderBy("updatedAt", "desc");
  if (user && !isAdmin) {
    query = ref.where("clientUid", "==", user.uid).orderBy("updatedAt", "desc");
  }
  query.onSnapshot(function (snap) {
    var priv = [];
    snap.forEach(function (doc) {
      var d = doc.data();
      if (isAdmin) {
        priv.push({ id: doc.id, type: "private", data: d, admin: true });
      } else if (user && d.clientUid === user.uid) {
        priv.push({ id: doc.id, type: "private", data: d });
      }
    });
    render(priv.concat(publicList));
  });
}