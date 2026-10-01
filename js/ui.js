function renderNav(active) {
  const links = [
    { href: "index.html", label: "Hoja de Vida" },
    { href: "index.html#servicios", label: "Servicios" },
    { href: "experiencias.html", label: "Experiencias" },
    { href: "blog.html", label: "Agenda" },
  ];
  return links
    .map(
      (l) =>
        `<a href="${l.href}" class="${l.href.split("#")[0] === active ? "active" : ""}">${l.label}</a>`
    )
    .join("");
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
