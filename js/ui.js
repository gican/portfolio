function renderNav(active) {
  const links = [
    { href: "index.html", label: "Hoja de Vida" },
    { href: "index.html#servicios", label: "Servicios", hash: "#servicios" },
    { href: "experiencias.html", label: "Experiencias" },
    { href: "blog.html", label: "Agenda" },
  ];
  return links
    .map(function (l) {
      const page = l.href.split("#")[0];
      let isActive = page === active;
      // "index.html#servicios" only highlights on the home page AND when the
      // servicios section is the one in view, so it never duplicates Hoja de Vida.
      if (l.hash && isActive) {
        isActive =
          typeof window !== "undefined" &&
          window.location.hash === l.hash &&
          Boolean(document.getElementById("servicios"));
      }
      return (
        '<a href="' + l.href + '" class="' + (isActive ? "active" : "") + '">' + l.label + "</a>"
      );
    })
    .join("");
}

function renderFloatActions() {
  if (document.querySelector(".float-actions")) return;
  var box = document.createElement("div");
  box.className = "float-actions";
  box.innerHTML =
    '<a class="float-btn float-wa" href="https://wa.me/542804856318" target="_blank" rel="noopener" ' +
    'aria-label="Escribime por WhatsApp" title="Escribime por WhatsApp">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.05c-.24.68-1.42 1.31-1.96 1.34-.5.03-.98.23-3.3-.69-2.78-1.1-4.55-3.94-4.69-4.13-.13-.19-1.13-1.5-1.13-2.86 0-1.36.71-2.03.97-2.31.24-.27.53-.34.71-.34.18 0 .37 0 .53.01.17.01.4-.06.62.47.24.56.8 1.94.87 2.08.07.14.12.3.02.49-.1.19-.14.3-.29.47-.14.16-.3.36-.43.49-.14.14-.29.29-.13.57.17.28.74 1.22 1.58 1.98 1.09.97 2 1.27 2.28 1.42.28.14.45.12.61-.07.17-.2.7-.81.88-1.09.19-.28.37-.23.62-.14.25.09 1.61.76 1.89.9.28.14.46.21.53.32.07.12.07.68-.17 1.35z"/>' +
    "</svg></a>";
  document.body.appendChild(box);
}

function renderGoUp() {
  const btn = document.createElement("button");
  btn.className = "go-up";
  btn.textContent = "↑";
  btn.setAttribute("aria-label", "Volver arriba");
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  document.body.appendChild(btn);
  window.addEventListener("scroll", () =>
    btn.classList.toggle("show", window.scrollY > 400)
  );
}
