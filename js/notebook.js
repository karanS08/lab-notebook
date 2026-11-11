/* Karan's Lab Notebook — progressive enhancement only.
   Every page works without this file. It adds:
   1. left/right arrow keys turn pages
   2. the slim dotted timeline strip on entry pages
   3. lazy loading of three.js sketches when they scroll into view

   ENTRIES: one line per entry. When you add an entry, add a line here
   and a row in the timeline on index.html. */
const ENTRIES = [
  ["000-toys", "Childhood", "The kid who broke every toy"],
  ["001-hot-glue-arm", "November 2017", "The hot-glue arm"],
  ["002-workshop-car", "around 2018", "The workshop car (brief)"],
  ["003-reading-errors", "early college", "I learned to read errors before I learned to write code"],
  ["004-class-bot", "October 2020", "The bot that attended my classes"],
  ["005-arm-revisited", "second year", "Revisiting the hot-glue arm"],
  ["006-cansat", "third year, sem 1", "CanSat, or how systems get built"],
  ["007-taiwan", "third year, sem 2", "Taiwan"],
  ["008-fist-drone", "Taiwan", "A drone that lands when I make a fist"],
  ["009-tiny-satellite", "final undergrad project", "A tiny satellite and a lying IMU"],
  ["010-teaching-80", "Plaksha", "Teaching 80 people to build a robot"],
  ["011-self-balancing", "Plaksha", "Self-balancing robots, and why math matters"],
  ["012-cart-pole", "Plaksha", "A cart-pole that balances like a person"],
  ["013-blimps", "Plaksha", "Blimps from bin bags"],
  ["014-glider", "Plaksha", "Redesigning a glider for 100 kids"],
  ["015-sugarcane-lasers", "Plaksha", "Lasers in sugarcane juice"],
  ["016-sugarcane-gaps", "Plaksha RA", "Finding the gaps in a sugarcane field"],
  ["017-sydney", "26 February", "Sydney"],
  ["018-pepper", "UTS", "Pepper, and where the memory idea started"],
  ["019-auv-7", "UTS", "The capstone, underwater"],
  ["020-space-robotics", "UTS", "Space Robotics"],
  ["021-rpv-mem", "2026", "RPV-Mem: a robot that remembers what it wasn't looking for"],
];

(function () {
  "use strict";
  const doc = document;

  /* 1. turning pages: a paper sound and a quick page turn, then the link.
        Arrow keys follow the plain <a rel=prev/next> links. */
  const sheetEl = doc.querySelector("main.sheet");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let turning = false;
  function turn(href, dir) {
    if (turning) return;
    turning = true;
    if (window.NotebookSound) window.NotebookSound.flip();
    if (still || !sheetEl) { setTimeout(() => (location.href = href), 120); return; }
    sheetEl.classList.add(dir === "prev" ? "turn-prev" : "turn-next");
    setTimeout(() => (location.href = href), 340);
  }
  // coming back via the back button restores this page from cache: unturn it
  addEventListener("pageshow", () => {
    turning = false;
    if (sheetEl) sheetEl.classList.remove("turn-prev", "turn-next");
  });

  doc.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || a.classList.contains("skip-intro") || a.classList.contains("skip")) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname === location.pathname) return;
    if (!/(\.html|\/)$/.test(u.pathname)) return;
    e.preventDefault();
    const back = (a.rel || "").includes("prev") || /index\.html$|\/$/.test(u.pathname);
    turn(a.href, back ? "prev" : "next");
  });

  doc.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT|CANVAS)$/.test(t.tagName))) return;
    if (t && t.closest && t.closest("[data-keys]")) return; // sketches that use arrows
    const rel = e.key === "ArrowLeft" ? "prev" : e.key === "ArrowRight" ? "next" : null;
    if (!rel) return;
    const a = doc.querySelector(`a[rel~="${rel}"]`);
    if (a) turn(a.href, rel);
  });

  /* 2. slim timeline strip */
  const strip = doc.querySelector("[data-strip]");
  if (strip) {
    const here = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
    const frag = doc.createDocumentFragment();
    ENTRIES.forEach(([slug, when, title], i) => {
      const a = doc.createElement("a");
      a.href = `${slug}.html`;
      a.title = `${String(i).padStart(3, "0")} · ${when} · ${title}`;
      a.setAttribute("aria-label", `Entry ${String(i).padStart(3, "0")}: ${title}`);
      if (slug === here) a.setAttribute("aria-current", "page");
      frag.appendChild(a);
    });
    const idx = ENTRIES.findIndex(([s]) => s === here);
    const lbl = doc.createElement("span");
    lbl.className = "lbl";
    lbl.textContent = idx >= 0 ? `page ${idx + 2} of ${ENTRIES.length + 1}` : "";
    frag.appendChild(lbl);
    strip.appendChild(frag);
    strip.hidden = false;
  }

  /* 3. keep text on the ruled lines: pad taped-in media so each block is
        a whole number of rules tall (photos and clips have any height) */
  const SNAP = ".taped:not(.tape-row .taped), .tape-row, .sketch";
  function snapRules(scope) {
    const rule = parseFloat(getComputedStyle(doc.documentElement).getPropertyValue("--rule")) || 28;
    scope.querySelectorAll(SNAP).forEach((el) => {
      el.style.paddingBottom = "0px";
      const h = el.offsetHeight; // layout height, ignores the tilt
      const extra = Math.ceil(h / rule - 0.01) * rule - h;
      el.style.paddingBottom = `${extra.toFixed(2)}px`;
    });
  }
  window.__snapRules = snapRules;
  const plainSheet = doc.querySelector("main.sheet");
  if (plainSheet) {
    const snap = () => snapRules(plainSheet);
    snap();
    addEventListener("load", snap);
    addEventListener("resize", snap);
    doc.querySelectorAll(".sheet img, .sheet video").forEach((m) =>
      m.addEventListener(m.tagName === "VIDEO" ? "loadedmetadata" : "load", snap));
    doc.fonts && doc.fonts.ready.then(snap);
  }

  /* 4. three.js sketches, loaded only when they come into view */
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base = new URL(".", doc.currentScript ? doc.currentScript.src : location.href);
  const canGL = !reduce && hasWebGL();
  function loadSketch(el) {
    if (!canGL || el.dataset.live || el.dataset.loading) return;
    el.dataset.loading = "1";
    const h0 = el.offsetHeight; // never shrink: in the book that would reflow the page
    import(new URL(`sketches/${el.dataset.sketch}.js`, base).href)
      .then((m) => {
        if (h0) el.style.minHeight = h0 + "px";
        if (m.default(el) !== false) el.dataset.live = "1";
        const sc = el.closest(".sheet, .flow");
        if (sc) snapRules(sc);
      })
      .catch(() => { /* file:// or offline: the fallback drawing stays */ });
  }
  window.__loadSketch = loadSketch; // the book reader calls this per page

  const sketches = doc.querySelectorAll("main.sheet .sketch[data-sketch]");
  if (sketches.length && canGL && !doc.documentElement.classList.contains("book-on")) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); loadSketch(en.target); }
    }, { rootMargin: "200px" });
    sketches.forEach((s) => io.observe(s));
  }

  function hasWebGL() {
    try {
      const c = doc.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (_) { return false; }
  }
})();
