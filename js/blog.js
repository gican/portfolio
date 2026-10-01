(function () {
  document.querySelector(".nav-links").innerHTML = renderNav("blog.html");
  renderGoUp();

  var authArea = document.getElementById("auth-area");
  var adminPanel = document.getElementById("admin-panel");
  var newThreadWrap = document.getElementById("new-thread-wrap");
  var threadList = document.getElementById("thread-list");
  var threadError = document.getElementById("thread-error");
  var unsubs = {}; // active message subscriptions

  // ---------- setup guide if not configured ----------
  function renderSetupGuide() {
    authArea.innerHTML =
      '<div class="auth-note"><strong>En modo configuración.</strong> ' +
      "Revisá que tu proyecto Firebase esté conectado en <code style='background:var(--surface);padding:.1rem .4rem;border-radius:4px'>js/firebase-config.js</code>.</div>";
  }

  if (!window.firebaseConfigured) {
    renderSetupGuide();
    return;
  }

  // ====================================================
  // AUTH UI
  // ====================================================
  function renderAuthArea() {
    if (!Blog.author) {
      authArea.innerHTML =
        '<div class="form-card">' +
        "<h3>Accedé a tus consultas</h3>" +
        '<label for="auth-email">Email</label>' +
        '<input type="email" id="auth-email" placeholder="tu@email.com" />' +
        '<label for="auth-pass">Contraseña</label>' +
        '<input type="password" id="auth-pass" placeholder="••••••••" />' +
        '<div class="error" id="auth-error"></div>' +
        '<div style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap">' +
        '<button class="btn" id="auth-login">Iniciar sesión</button>' +
        '<button class="btn" id="auth-signup" style="background:var(--accent-2)">Registrarme</button>' +
        "</div>" +
        '<p style="color:var(--text-dim);font-size:.8rem;margin-top:.75rem">Si sos un cliente nuevo, usá “Registrarme”. Tu consulta quedará privada entre vos y el proveedor.</p>' +
        "</div>";
      bindAuth();
    } else {
      var isAdmin = Blog.isAdmin();
      var label = isAdmin
        ? "<strong>Panel de administrador</strong>"
        : "<strong>" + Blog.escape(Blog.author.email) + "</strong>";
      authArea.innerHTML =
        '<div class="auth-note">' +
        label +
        " · <a href='#' id='logout-btn' style='color:var(--accent)'>Cerrar sesión</a></div>";
      document
        .getElementById("logout-btn")
        .addEventListener("click", function (e) {
          e.preventDefault();
          auth.signOut();
        });
    }
  }

  function bindAuth() {
    var err = document.getElementById("auth-error");
    function doAuth(mode) {
      var email = document.getElementById("auth-email").value.trim();
      var pass = document.getElementById("auth-pass").value;
      if (!email || !pass) {
        err.textContent = "Completá email y contraseña.";
        return;
      }
      err.textContent = "";
      var p =
        mode === "signup"
          ? auth.createUserWithEmailAndPassword(email, pass)
          : auth.signInWithEmailAndPassword(email, pass);
      p.catch(function (e) {
        err.textContent = e.message;
      });
    }
    document.getElementById("auth-login").addEventListener("click", function () {
      doAuth("login");
    });
    document
      .getElementById("auth-signup")
      .addEventListener("click", function () {
        doAuth("signup");
      });
  }

  // ====================================================
  // NEW THREAD (client)
  // ====================================================
  function bindNewThread() {
    document
      .getElementById("thread-submit")
      .addEventListener("click", function () {
        var subject = document.getElementById("thread-subject").value.trim();
        var message = document.getElementById("thread-message").value.trim();
        threadError.textContent = "";
        if (!subject || !message) {
          threadError.textContent = "Asunto y consulta son obligatorios.";
          return;
        }
        Blog.createThread(subject, message)
          .then(function () {
            document.getElementById("thread-subject").value = "";
            document.getElementById("thread-message").value = "";
          })
          .catch(function (e) {
            threadError.textContent = e.message;
          });
      });
  }

  // ====================================================
  // RENDER THREADS LIST
  // ====================================================
  function renderThreads(threads) {
    var user = Blog.author;
    var isAdmin = Blog.isAdmin();

    if (user && !isAdmin) {
      newThreadWrap.style.display = "block";
      bindNewThread();
    }
    if (isAdmin) {
      renderAdminPanel(threads.filter(function (t) { return t.type !== "public"; }));
    }

    if (!threads.length) {
      threadList.innerHTML =
        '<p class="empty">' +
        (user
          ? "Todavía no tenés consultas. Creá la primera arriba."
          : "Todavía no hay publicaciones ni testimonios públicos.") +
        "</p>";
      return;
    }

    var title = document.createElement("h2");
    title.textContent =
      isAdmin
        ? "Todas las consultas"
        : user
        ? "Mis consultas y seguimiento"
        : "Testimonios públicos";
    threadList.innerHTML = "";
    threadList.appendChild(title);

    threads.forEach(function (t) {
      threadList.appendChild(threadCard(t));
    });
  }

  function threadCard(t) {
    var isAdmin = t.admin === true;
    var isPublic = t.type === "public";
    var canOpen = true;
    var d = t.data;

    var wrap = document.createElement("div");
    wrap.className = "form-card";
    wrap.style.cursor = "pointer";
    wrap.innerHTML =
      '<div class="item-header">' +
      "<h3>" +
      Blog.escape(d.subject) +
      "</h3>" +
      '<span class="meta">' +
      Blog.sortDate(d.updatedAt) +
      "</span></div>" +
      (isAdmin
        ? '<div class="meta" style="margin-top:.3rem">Cliente: ' +
          Blog.escape(d.clientName || d.clientEmail) +
          " · " +
          '<span style="text-transform:capitalize">' +
          Blog.escape(d.status || "nueva") +
          "</span></div>"
        : isPublic
        ? '<div class="meta" style="margin-top:.3rem">' +
          Blog.escape(d.clientName || "Cliente") +
          "</div>"
        : "") +
      '<p style="color:var(--text-dim);font-size:.9rem;margin-top:.5rem">' +
      "Abrir conversación…" +
      "</p>";

    var clicked = false;
    wrap.addEventListener("click", function () {
      if (clicked) return;
      clicked = true;
      openThread(t, wrap);
    });
    return wrap;
  }

  // ====================================================
  // OPEN THREAD (detail + messages + reply)
  // ====================================================
  function openThread(t, card) {
    var id = t.id;
    var d = t.data;
    var isPublic = t.type === "public";
    var isAdmin = t.admin === true || (Blog.isAdmin() && !isPublic);
    var isOwner =
      !isPublic &&
      Blog.author &&
      d.clientUid === Blog.author.uid;
    var canReply = isAdmin || isOwner;

    var block = document.createElement("div");
    block.className = "form-card";
    block.innerHTML =
      '<div class="item-header">' +
      "<h3>" +
      Blog.escape(d.subject) +
      "</h3>" +
      '<button class="btn" id="th-close" style="padding:.3rem .7rem;font-size:.8rem">Volver</button>' +
      "</div>" +
      (isAdmin
        ? '<div class="meta" style="margin:.3rem 0">Cliente: ' +
          Blog.escape(d.clientName || d.clientEmail) +
          "</div>"
        : isPublic
        ? '<div class="meta" style="margin:.3rem 0">' +
          Blog.escape(d.clientName || "Cliente") +
          "</div>"
        : "") +
      '<div id="th-msgs"><p class="empty" style="padding:1rem">Cargando…</p></div>';

    // Close
    block
      .querySelector("#th-close")
      .addEventListener("click", function () {
        if (unsubs[id]) unsubs[id]();
        location.reload();
      });

    card.parentNode.replaceChild(block, card);

    // Messaging subscription
    var msgsEl = block.querySelector("#th-msgs");
    var loadFn = isPublic ? Blog.loadPublicMessages : Blog.loadMessages;
    unsubs[id] = loadFn.call(Blog, id, function (snap) {
      var rows = [];
      snap.forEach(function (m) { rows.push(m.data()); });
      renderMessages(msgsEl, rows, d, isAdmin);
    });

    // Reply box
    if (canReply) {
      appendReplyBox(block, id, d, isAdmin, isOwner);
    }
  }

  function renderMessages(el, rows, d, isAdmin) {
    el.innerHTML = "";
    if (!rows.length) {
      el.innerHTML = '<p class="empty" style="padding:1rem">Sin mensajes todavía.</p>';
      return;
    }
    rows.forEach(function (m) {
      var isClientMsg = m.from === "client";
      var myMsg = isAdmin ? !isClientMsg : isClientMsg;
      var box = document.createElement("div");
      box.className = "comment";
      box.style.borderLeft =
        myMsg ? "4px solid var(--accent)" : "4px solid var(--surface)";
      box.innerHTML =
        '<div class="comment-head"><span class="comment-author">' +
        (isClientMsg
          ? Blog.escape(d.clientName || "Cliente")
          : "Yo (Admin)") +
        '</span><span class="comment-date">' +
        Blog.sortDate(m.createdAt) +
        "</span></div>" +
        '<div class="comment-body">' +
        Blog.escape(m.text) +
        "</div>";
      el.appendChild(box);
    });
  }

  function appendReplyBox(block, id, d, isAdmin, isOwner) {
    var rep = document.createElement("div");
    rep.style.marginTop = "1rem";
    rep.innerHTML =
      '<label>Responder</label>' +
      '<textarea id="th-reply" placeholder="Escribí tu respuesta..."></textarea>' +
      '<div class="row" style="margin-top:.75rem">' +
      '<div><button class="btn" id="th-reply-btn">' +
      (isAdmin ? "Responder al cliente" : "Enviar respuesta") +
      "</button></div>" +
      (isAdmin
        ? '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
          '<button class="btn" id="th-pub" style="background:#059669">Hacer público</button>' +
          '<select id="th-status" style="max-width:160px">' +
          '<option value="nueva"' + (d.status === "nueva" ? " selected" : "") + ">Nueva</option>" +
          '<option value="en_proceso"' + (d.status === "en_proceso" ? " selected" : "") + ">En proceso</option>" +
          '<option value="resuelta"' + (d.status === "resuelta" ? " selected" : "") + ">Resuelta</option>" +
          "</select>" +
          "<button class='btn' id='th-status-btn' style='background:var(--accent-2)'>Guardar estado</button>" +
          "</div>"
        : "") +
      "</div>" +
      '<div class="error" id="th-error"></div>';

    block.appendChild(rep);

    var err = rep.querySelector("#th-error");
    rep
      .querySelector("#th-reply-btn")
      .addEventListener("click", function () {
        var text = rep.querySelector("#th-reply").value.trim();
        if (!text) {
          err.textContent = "Escribí una respuesta.";
          return;
        }
        var from = isAdmin ? "admin" : "client";
        Blog.addMessage(id, from, text)
          .then(function () {
            rep.querySelector("#th-reply").value = "";
            err.textContent = "";
          })
          .catch(function (e) {
            err.textContent = e.message;
          });
      });

    if (isAdmin) {
      rep.querySelector("#th-pub").addEventListener("click", function () {
        Blog.setThreadState(id, { isPublic: true })
          .then(function () {
            err.textContent = "Publicado como testimonio.";
          })
          .catch(function (e) {
            err.textContent = e.message;
          });
      });
      rep
        .querySelector("#th-status-btn")
        .addEventListener("click", function () {
          var st = rep.querySelector("#th-status").value;
          Blog.setThreadState(id, { status: st }).catch(function (e) {
            err.textContent = e.message;
          });
        });
    }
  }

  // ====================================================
  // ADMIN PANEL
  // ====================================================
  function renderAdminPanel(threads) {
    var counts = { nueva: 0, en_proceso: 0, resuelta: 0 };
    threads.forEach(function (t) {
      var st = t.data.status || "nueva";
      counts[st] = (counts[st] || 0) + 1;
    });
    adminPanel.style.display = "block";
    adminPanel.className = "admin-panel";
    adminPanel.innerHTML =
      '<span class="admin-badge">Solo administrador</span>' +
      "<h3>Panel de Administración</h3>" +
      '<div class="admin-stats">' +
      '<div class="admin-stat"><div class="num">' + counts.nueva + "</div><div class='lbl'>Nuevas</div></div>" +
      '<div class="admin-stat"><div class="num">' + counts.en_proceso + "</div><div class='lbl'>En proceso</div></div>" +
      '<div class="admin-stat"><div class="num">' + counts.resuelta + "</div><div class='lbl'>Resueltas</div></div>" +
      '<div class="admin-stat"><div class="num">' + threads.length + "</div><div class='lbl'>Total</div></div>" +
      "</div>" +
      '<p class="hint">Acceso restringido: solo podés ver y responder consultas aquí. Hacé clic en un hilo para responderlo o publicarlo como testimonio.</p>';
  }

  // ====================================================
  // WIRE UP
  // ====================================================
  auth.onAuthStateChanged(function (user) {
    Blog.author = user;

    // Always drop previous listeners before re-rendering for the new role.
    Blog.stopThreads();
    Object.keys(unsubs).forEach(function (k) {
      try { unsubs[k](); } catch (e) {}
    });
    unsubs = {};

    // Never leave the admin panel (nor admin data) on screen for a non-admin.
    if (!user || !Blog.isAdmin()) {
      adminPanel.style.display = "none";
      adminPanel.innerHTML = "";
    }

    renderAuthArea();

    if (user && Blog.isAdmin()) {
      newThreadWrap.style.display = "none";
    } else if (user) {
      newThreadWrap.style.display = "block";
      bindNewThread();
    } else {
      newThreadWrap.style.display = "none";
    }

    Blog.loadThreads(renderThreads);
  });
})();
