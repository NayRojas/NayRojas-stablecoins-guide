(() => {
  const G = window.GLOSARIO, CATS = window.CATEGORIAS;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Hero: precio oscilando alrededor del peg ── */
  (function peg() {
    const path = $("#price"), dot = $("#dot"), out = $("#peg-readout");
    const W = 1200, MID = 110, N = 120;
    let pts = [], t = 0;
    const sample = (i) => {
      // Desvíos pequeños con un único "susto" de depeg que el arbitraje corrige.
      const base = Math.sin(i * 0.35) * 3 + Math.sin(i * 0.11 + 1) * 4;
      const shock = Math.exp(-Math.pow((i % 160) - 110, 2) / 30) * 46;
      return MID + base + shock;
    };
    for (let i = 0; i < N; i++) pts.push(sample(i));
    const draw = () => {
      const step = W / (N - 1);
      path.setAttribute("d", pts.map((y, i) => (i ? "L" : "M") + (i * step).toFixed(1) + " " + y.toFixed(1)).join(" "));
      const y = pts[N - 1];
      dot.setAttribute("cx", W - 9); dot.setAttribute("cy", y);
      out.textContent = (1 - (y - MID) / 1000).toFixed(3).replace(".", ",") + " USD";
    };
    draw();
    if (reduce) return;
    let last = 0;
    const tick = (ts) => {
      if (ts - last > 90) { pts.shift(); pts.push(sample(N + t++)); draw(); last = ts; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })();

  /* ── Glosario ── */
  const sorted = [...G].sort((a, b) => a.t.localeCompare(b.t, "es", { sensitivity: "base" }));
  let cat = "all", q = "";

  const chips = $("#chips");
  const chipData = [["all", "Todas"], ...Object.entries(CATS)];
  chips.innerHTML = chipData.map(([k, v]) => {
    const n = k === "all" ? G.length : G.filter((x) => x.c === k).length;
    return `<button class="chip" type="button" data-cat="${k}" aria-pressed="${k === "all"}">${v} <span aria-hidden="true">${n}</span></button>`;
  }).join("");
  chips.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    setCat(b.dataset.cat);
  });
  function setCat(k) {
    cat = k;
    chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === k)));
    render();
  }

  const hl = (text) => {
    const safe = esc(text);
    if (!q) return safe;
    const nt = norm(safe), nq = norm(esc(q));
    let out = "", i = 0, j;
    while ((j = nt.indexOf(nq, i)) !== -1) { out += safe.slice(i, j) + "<mark>" + safe.slice(j, j + nq.length) + "</mark>"; i = j + nq.length; }
    return out + safe.slice(i);
  };
  const letterOf = (t) => norm(t)[0].toUpperCase();

  function render() {
    const nq = norm(q.trim());
    const list = sorted.filter((x) => (cat === "all" || x.c === cat) &&
      (!nq || norm(x.t + " " + x.d + " " + x.n).includes(nq)));
    const groups = {};
    list.forEach((x) => (groups[letterOf(x.t)] ||= []).push(x));
    const letters = Object.keys(groups);

    $("#letters").innerHTML = letters.map((l) => `<a href="#l-${l}">${l}</a>`).join("");
    $("#terms").innerHTML = list.length ? letters.map((l) => `
      <section class="letter-group" id="l-${l}" aria-label="Letra ${l}">
        <h3>${l}</h3>
        <dl>${groups[l].map((x) => `
          <div class="term">
            <dt><strong>${hl(x.t)}</strong><span class="tag">${CATS[x.c]}</span></dt>
            <dd>${hl(x.d)}<p class="biz"><b>En negocio:</b> ${hl(x.n)}</p></dd>
          </div>`).join("")}
        </dl>
      </section>`).join("")
      : `<p class="empty">Ningún término coincide con “${esc(q)}”. Prueba con otra palabra o elige “Todas” en los filtros.</p>`;

    const label = cat === "all" ? "todas las categorías" : CATS[cat];
    $("#status").textContent = `${list.length} ${list.length === 1 ? "término" : "términos"} en ${label}${q ? ` que contienen “${q}”` : ""}.`;
  }

  let timer;
  $("#q").addEventListener("input", (e) => { clearTimeout(timer); timer = setTimeout(() => { q = e.target.value; render(); }, 120); });

  // Enlaces de la ruta que filtran el glosario
  document.querySelectorAll("a[data-cat]").forEach((a) => a.addEventListener("click", () => {
    $("#q").value = ""; q = ""; setCat(a.dataset.cat);
  }));

  render();

  /* ── Recursos ── */
  const videoRow = (v) => `
    <div class="res-row">
      <div><a class="title" href="${v.url}" target="_blank" rel="noopener">${esc(v.titulo)}</a>
      <div class="res-meta">${esc(v.canal)}, ${v.anio}</div></div>
      <div class="side">${v.tema}</div>
    </div>`;
  $("#video-list").innerHTML = window.VIDEOS.map(videoRow).join("");
  $("#video-list-en").innerHTML = window.VIDEOS_EN.map(videoRow).join("");

  $("#course-list").innerHTML = Object.entries(window.CURSOS).map(([plat, cs]) => `
    <section class="platform" aria-label="${plat}">
      <h3>${plat}</h3>
      <div class="res-table">${cs.map((c) => `
        <div class="res-row">
          <div><a class="title" href="${c.url}" target="_blank" rel="noopener">${esc(c.titulo)}</a>
          <div class="res-meta">${esc(c.por)}</div></div>
          <div class="side"><span class="level">${c.nivel}</span>${c.duracion}</div>
          <p class="res-note">${esc(c.nota)}</p>
        </div>`).join("")}
      </div>
    </section>`).join("");
})();
