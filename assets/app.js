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
  $("#total").textContent = `${G.length} términos`;

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

/* ── Cadena de bloques interactiva ── */
(() => {
  const root = document.getElementById("chain");
  if (!root) return;
  const INIT = [
    "Ana → Luis: 50 USDC\nLuis → Rosa: 20 USDC",
    "Rosa → Pedro: 15 USDC\nPedro → Ana: 5 USDC",
    "Ana → Mía: 30 USDC",
    "Mía → Luis: 12 USDC\nLuis → Pedro: 8 USDC"
  ];
  const enc = new TextEncoder();
  const sha = async (txt) => {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 2166136261; // respaldo simple si no hay WebCrypto
    for (const c of txt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(16).padStart(8, "0").repeat(8);
  };
  const short = (h) => h.slice(0, 10) + "…";
  let sealed = [];

  root.innerHTML = INIT.map((d, i) => `
    <div class="block" data-i="${i}">
      <div class="block-head">Bloque ${i + 1}<span class="block-state">Válido</span></div>
      <label for="b${i}">Transacciones</label>
      <textarea id="b${i}" rows="3" spellcheck="false">${d}</textarea>
      <div class="hashrow"><span>Huella anterior</span><code class="p">—</code><span>Huella</span><code class="h">—</code></div>
    </div>`).join("");
  const blocks = [...root.querySelectorAll(".block")];

  async function compute() {
    let prev = "0".repeat(64), out = [];
    for (let i = 0; i < blocks.length; i++) {
      const data = blocks[i].querySelector("textarea").value;
      const h = await sha(i + "|" + prev + "|" + data);
      out.push({ prev, h }); prev = h;
    }
    return out;
  }
  async function update() {
    const res = await compute();
    if (!sealed.length) sealed = res.map((r) => r.h);
    let broken = false;
    res.forEach((r, i) => {
      const b = blocks[i];
      broken = broken || r.h !== sealed[i];
      b.classList.toggle("broken", broken);
      b.querySelector(".block-state").textContent = broken ? "Alterado" : "Válido";
      b.querySelector("code.p").textContent = i ? short(r.prev) : "inicio";
      b.querySelector("code.h").textContent = short(r.h);
    });
  }
  let t;
  root.addEventListener("input", () => { clearTimeout(t); t = setTimeout(update, 80); });
  document.getElementById("chain-reset").addEventListener("click", () => {
    blocks.forEach((b, i) => (b.querySelector("textarea").value = INIT[i])); update();
  });
  update();
})();
