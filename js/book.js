/* The notebook as a book.
   - Intro: the closed notebook on a desk; wheel / swipe / keys drive the
     camera in, the cover swings open, and the book settles open.
   - Reading: every entry is poured into fixed-size pages (CSS columns) and
     you turn one leaf at a time with the wheel, a swipe, arrow keys or the
     buttons. Scrolling back past the first page closes the book again.
   Only runs when the head script put .book-on on <html>. Without JS the
   plain contents page and the plain entry pages are what you get. */
(function () {
  "use strict";
  const root = document.documentElement;
  if (!root.classList.contains("book-on")) return;
  const STILL = root.classList.contains("still");

  const $ = (s, r = document) => r.querySelector(s);
  const stage = $(".intro-stage"), cam = $(".cam"), book = $(".book");
  const coverEl = $(".bcover"), slotR = $(".slot-r"), slotL = $(".slot-l"), flipper = $(".flipper");
  const faceF = $(".flipper .front"), faceB = $(".flipper .back");
  const card = $(".card"), tip = $(".tip"), hint = $(".hint"), skip = $(".skip-intro");
  const bars = document.querySelectorAll(".bar");
  const plain = $("main.cover");
  const bar = $(".reader-bar"), countEl = $(".reader-bar .count");
  const btnPrev = $(".reader-bar .prev"), btnNext = $(".reader-bar .next"), btnToc = $(".reader-bar .toc");

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const snd = (k) => window.NotebookSound && window.NotebookSound[k]();
  const FLIP_MS = STILL ? 1 : 720;
  root.style.setProperty("--flip-ms", FLIP_MS + "ms");

  /* ------------------------------------------------------------------ */
  /* geometry                                                            */
  /* ------------------------------------------------------------------ */
  let G = {};
  function geometry() {
    const vw = innerWidth, vh = innerHeight, cs = getComputedStyle(root);
    const rule = parseFloat(cs.getPropertyValue("--rule")) || 28;
    const barH = 52, top = 14;
    let pw, ph, spread;
    if (vw >= 900) {
      ph = Math.min(vh - barH - top - 6, 1123);
      pw = ph / 1.4142;
      if (pw * 2 > vw - 60) { pw = (vw - 60) / 2; ph = pw * 1.4142; }
      spread = true;
    } else {
      pw = vw - 20;
      ph = vh - barH - top;
      spread = false;
    }
    pw = Math.round(pw); ph = Math.round(ph);
    const wide = pw >= 540;
    const gut = wide ? (pw >= 700 ? 150 : 122) : 0;
    const mx = Math.round(pw * (vw < 480 ? 0.1 : 0.12));
    const pl = mx + (vw < 480 ? 10 : 18);
    const pr = wide ? gut : 16;
    const padT = rule * 2, padB = rule * 2;
    const ch = Math.floor((ph - padT - padB) / rule) * rule;
    const cw = pw - pl - pr;
    const gap = gut + 48;
    G = { vw, vh, rule, pw, ph, spread, wide, gut, mx, pl, cw, ch, gap, padT, barH, top,
          winW: cw + (wide ? gut - 6 : 0) };
    const set = (k, v) => root.style.setProperty(k, v);
    set("--pw", pw + "px"); set("--ph", ph + "px"); set("--bw", pw + "px");
    set("--pad-t", padT + "px"); set("--mx", mx + "px"); set("--pl", pl + "px");
    set("--cw", cw + "px"); set("--ch", ch + "px"); set("--gap", gap + "px");
    set("--gut", gut + "px"); set("--win-w", G.winW + "px");
    set("--ds", (pw / 570).toFixed(4)); // the desk scene is drawn for a 570px-wide book
    G.fit = window.__desk ? fitDesk() : null;
    layoutCard();
    // blank leaf under the cover uses the same ruling
    set("--leaf-rule", rule + "px"); set("--leaf-off", padT - 5 + "px"); set("--leaf-px", "1px");
  }

  /* opening shot: the zoom and height that fit the whole desk (shelf top
     to front edge, left to right) between the letterbox bars. Mirrors the
     CSS camera: perspective 1500px from (50%, 40%), the .cam transform
     below, and the desk's placement in js/desk.js. */
  const RX0 = 60;
  function fitDesk() {
    const { vw, vh, pw, ph } = G, ds = pw / 570, P = 1500, ox = vw / 2, oy = vh * 0.4;
    const cos = Math.cos(RX0 * Math.PI / 180), sin = Math.sin(RX0 * Math.PI / 180);
    // desk points (x, y back->front, z up) that must stay in view
    const pts = [[0, 2200, -70], [3400, 2200, -70], [0, 2200, 0], [3400, 2200, 0], [0, 0, 0], [3400, 0, 0], [0, 170, 1830], [3400, 170, 1830],
      [50, 420, 1500], [50, 2180, 1500], [50, 2180, 60]]; // + the memory board on the left wall
    const left = 6, right = vw - 6;
    // the room's back corners (left wall at x -20, right wall at x 4900): the shot is centred between them
    const ROOM = [[-20, 0, 0], [4900, 0, 0]];
    function box(sc, cy, cx, list = pts) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y, z] of list) {
        const qx = ds * (x - 1415) - pw / 2, qy = ds * (y - 900) - ph / 2, qz = ds * z - 24;
        const sx = cx + sc * qx, sy = cy + sc * (cos * qy - sin * qz), sz = sc * (sin * qy + cos * qz);
        const k = P / (P - sz);
        const X = ox + (sx - ox) * k, Y = oy + (sy - oy) * k;
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      }
      return { x0, x1, y0, y1 };
    }
    const top = vh * 0.1 + 6, bot = vh * 0.9 - 6, mid = (top + bot) / 2;
    const place = (sc) => {
      let cy = vh / 2, cx = vw / 2;
      for (let i = 0; i < 6; i++) {
        const b = box(sc, cy, cx), r = box(sc, cy, cx, ROOM);
        cy += mid - (b.y0 + b.y1) / 2;
        cx += vw / 2 - (r.x0 + r.x1) / 2;
      }
      return [cy, cx];
    };
    let lo = 0.05, hi = 1.5;
    for (let i = 0; i < 24; i++) {
      const sc = (lo + hi) / 2, [cy, cx] = place(sc), b = box(sc, cy, cx);
      if (b.y1 - b.y0 <= bot - top && b.x0 >= left && b.x1 <= right) lo = sc; else hi = sc;
    }
    const [cy, cx] = place(lo);
    return { sc: lo, cy, cx, x0: box(lo, cy, cx).x0, top };
  }

  /* the title sits in the empty space left of the desk, sized to fit it */
  function layoutCard() {
    if (!card) return;
    card.style.removeProperty("--ts"); card.style.top = ""; card.style.bottom = "";
    card.classList.remove("in-bar");
    const f = G.fit;
    if (!f || G.vw < 900) return;
    card.style.setProperty("--ts", "100px");
    const w100 = card.getBoundingClientRect().width;
    const room = f.x0 - card.offsetLeft - 28;
    const ts = Math.min(112, (100 * room) / w100);
    if (ts >= 56) {
      card.style.setProperty("--ts", ts.toFixed(1) + "px");
      card.style.top = f.top + 24 + "px";
      card.style.bottom = "auto";
      return;
    }
    // no room beside the desk: one line in the top letterbox bar
    const barH = G.vh * 0.1, t = Math.max(26, barH * 0.6);
    card.classList.add("in-bar");
    card.style.setProperty("--ts", t.toFixed(1) + "px");
    card.style.top = ((barH - t * 0.92) / 2).toFixed(1) + "px";
    card.style.bottom = "auto";
  }

  /* ------------------------------------------------------------------ */
  /* content: the contents page + every entry we can fetch               */
  /* ------------------------------------------------------------------ */
  const docs = [];           // {id, label, node}
  const pages = [];          // {d, k, n}
  const firstPage = {};      // doc id -> page index
  let measureBox;

  function contentsDoc() {
    const node = document.createElement("div");
    node.innerHTML = plain.innerHTML;
    return { id: "contents", label: "contents", node };
  }

  async function fetchEntries() {
    const links = [...plain.querySelectorAll('.timeline a[href^="entries/"]')];
    const got = await Promise.all(links.map(async (a) => {
      try {
        const r = await fetch(a.getAttribute("href"));
        if (!r.ok) return null;
        const html = await r.text();
        const d = new DOMParser().parseFromString(html, "text/html");
        const art = d.querySelector("article");
        if (!art) return null;
        const node = document.createElement("div");
        node.append(...art.childNodes);
        const doodle = d.querySelector("main .doodle");
        if (doodle) node.append(doodle);
        // paths inside entries are relative to /entries/
        node.querySelectorAll("[src]").forEach((el) => {
          const v = el.getAttribute("src");
          if (v && v.startsWith("../")) el.setAttribute("src", v.slice(3));
        });
        node.querySelectorAll("a[href]").forEach((el) => {
          const v = el.getAttribute("href");
          if (v && v.startsWith("../")) el.setAttribute("href", v.slice(3));
          else if (v && /^[\w-]+\.html/.test(v)) el.setAttribute("href", "entries/" + v);
        });
        const id = a.getAttribute("href").match(/entries\/(\d{3})/)[1];
        return { id, label: "Entry " + id, node };
      } catch (_) { return null; }
    }));
    return got.filter(Boolean);
  }

  function makeFlow(d) {
    const f = document.createElement("div");
    f.className = "flow";
    f.dataset.doc = d.id;
    f.innerHTML = d.node.innerHTML;
    return f;
  }

  // the last column anything visible starts in. (scrollWidth over-counts:
  // margin notes hang out into the gutter, past the column edge, and would
  // add a blank page after the entry)
  function lastColumn(f, step) {
    const x0 = f.getBoundingClientRect().left;
    let last = 0;
    const col = (r) => {
      if (r.width < 1 || r.height < 1) return;
      last = Math.max(last, Math.floor((r.left - x0 + 2) / step));
    };
    const tw = document.createTreeWalker(f, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const rg = document.createRange();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === 3) {
        if (!n.textContent.trim()) continue;
        rg.selectNodeContents(n);
        for (const r of rg.getClientRects()) col(r);
      } else if (n.matches(".doodle, .doodle *")) {
        continue; // decoration never earns a page of its own
      } else if (n.matches("img, svg, canvas, video, .blank, .sketch, .taped")) {
        for (const r of n.getClientRects()) col(r);
      }
    }
    return last;
  }

  function paginate() {
    pages.length = 0;
    if (!measureBox) {
      measureBox = document.createElement("div");
      measureBox.className = "pg-measure";
      document.body.appendChild(measureBox);
    }
    measureBox.innerHTML = "";
    const pg = document.createElement("div");
    pg.className = "pg" + (G.wide ? " wide" : "");
    pg.style.cssText = `position:relative;width:${G.pw}px;height:${G.ph}px`;
    const win = document.createElement("div");
    win.className = "pg-win";
    pg.appendChild(win);
    measureBox.appendChild(pg);
    for (const d of docs) {
      const f = makeFlow(d);
      win.replaceChildren(f);
      window.__snapRules && window.__snapRules(f);
      const step = G.cw + G.gap;
      const n = lastColumn(f, step) + 1;
      // a doodle pushed past the last real page is simply left out
      const x0 = f.getBoundingClientRect().left;
      f.querySelectorAll(".doodle").forEach((el) => {
        if (Math.floor((el.getBoundingClientRect().left - x0 + 2) / step) >= n) el.remove();
      });
      d.template = f.innerHTML; // snapped
      firstPage[d.id] = pages.length;
      for (let k = 0; k < n; k++) pages.push({ d, k, n });
    }
    measureBox.innerHTML = "";
    [...cache.keys()].forEach(drop);
  }

  /* ------------------------------------------------------------------ */
  /* page elements                                                       */
  /* ------------------------------------------------------------------ */
  const cache = new Map();
  function drop(key) {
    const pg = cache.get(key);
    if (pg) pg.querySelectorAll(".sketch").forEach((el) => el.__dispose && el.__dispose());
    cache.delete(key);
  }
  function pageEl(i) {
    if (cache.has(i)) return cache.get(i);
    const { d, k } = pages[i];
    const pg = document.createElement("div");
    pg.className = "pg" + (G.wide ? " wide" : "");
    pg.dataset.i = i;
    const win = document.createElement("div");
    win.className = "pg-win";
    const f = document.createElement("div");
    f.className = "flow";
    f.innerHTML = d.template;
    f.style.transform = `translateX(${-k * (G.cw + G.gap)}px)`;
    // hide what belongs to other pages from screen readers and the tab order
    win.appendChild(f);
    pg.appendChild(win);
    if (k > 0) {
      const run = document.createElement("span");
      run.className = "pg-run";
      run.textContent = d.id === "contents" ? "contents (cont.)" : `${d.label} (cont.)`;
      pg.appendChild(run);
    }
    const no = document.createElement("span");
    no.className = "pg-no";
    no.textContent = `page ${i + 1} of ${pages.length}`;
    pg.appendChild(no);
    cache.set(i, pg);
    // keep the cache small
    if (cache.size > 9) for (const key of cache.keys()) { if (Math.abs(key - cur) > 4) drop(key); }
    return pg;
  }
  function backEl(i) {
    // (canvases stay in the clone: removing them would reflow the text)
    const pg = document.createElement("div");
    pg.className = "pg back";
    if (i >= 0 && pages[i]) {
      const b = document.createElement("div");
      b.className = "bleed";
      const src = pageEl(i).cloneNode(true);
      src.querySelectorAll("[data-sketch]").forEach((n) => n.removeAttribute("data-sketch"));
      src.querySelectorAll("video").forEach((n) => n.removeAttribute("src"));
      src.classList.remove("back");
      b.appendChild(src);
      pg.appendChild(b);
    }
    return pg;
  }
  function wake(pg) {
    const k = pages[+pg.dataset.i] ? pages[+pg.dataset.i].k : 0, step = G.cw + G.gap;
    pg.querySelectorAll(".sketch[data-sketch]").forEach((el) => {
      // every page holds a copy of the whole entry; only the copy whose
      // column is on show may run the sketch
      if (!el.dataset.live && Math.floor((el.offsetLeft + 2) / step) !== k) return;
      if (el.dataset.live && el.__kick) el.__kick();
      else window.__loadSketch && window.__loadSketch(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /* reading state + page turns                                          */
  /* ------------------------------------------------------------------ */
  let cur = 0, busy = false, ready = false;
  function setLeft(i) {
    if (i < 0) { slotL.classList.remove("on"); slotL.replaceChildren(); return; }
    slotL.replaceChildren(backEl(i));
    slotL.classList.add("on");
  }
  function show(i) {
    cur = clamp(i, 0, pages.length - 1);
    slotR.replaceChildren(pageEl(cur));
    setLeft(cur - 1);
    after();
  }
  function after() {
    if (!hinting) countEl.textContent = `page ${cur + 1} of ${pages.length}`;
    btnNext.disabled = cur >= pages.length - 1;
    requestAnimationFrame(() => wake(slotR.firstChild));
    // warm the neighbours
    if (pages[cur + 1]) pageEl(cur + 1);
    if (pages[cur - 1]) pageEl(cur - 1);
  }

  function turnTo(t) {
    t = clamp(t, 0, pages.length - 1);
    if (busy || t === cur || !ready) return;
    busy = true;
    Math.abs(t - cur) > 1 ? snd("riffle") : snd("flip");
    hinting = false;
    const fwd = t > cur;
    if (fwd) {
      faceF.replaceChildren(pageEl(cur));
      faceB.replaceChildren(backEl(t - 1));
      slotR.replaceChildren(pageEl(t));
    } else {
      faceF.replaceChildren(pageEl(t));
      faceB.replaceChildren(backEl(t));
      setLeft(t - 1);
    }
    flipper.className = "flipper on " + (fwd ? "fwd" : "bwd");
    setTimeout(() => {
      if (fwd) setLeft(t - 1); else slotR.replaceChildren(pageEl(t));
      flipper.className = "flipper";
      faceF.replaceChildren(); faceB.replaceChildren();
      cur = t;
      busy = false;
      after();
      if (++turns === 3) walker();
    }, FLIP_MS + 20);
  }
  /* the margin robot: walks along the bottom of the page, trips over the
     red margin line, gets up, and leaves. Once per visit. */
  let turns = 0;
  function walker() {
    if (STILL) return;
    try { if (sessionStorage.getItem("nb-walker")) return; sessionStorage.setItem("nb-walker", "1"); } catch (_) {}
    const pg = slotR.firstChild;
    if (!pg) return;
    const w = document.createElement("div");
    w.className = "walker";
    w.setAttribute("aria-hidden", "true");
    w.style.setProperty("--w-from", G.pw + 10 + "px");
    w.style.setProperty("--w-trip", G.mx - 4 + "px");
    w.innerHTML = '<div class="body"><img src="img/doodles/robot.svg" alt=""><span class="oops">oops</span></div>';
    pg.appendChild(w);
    setTimeout(() => w.remove(), 9200);
  }
  const next = () => turnTo(cur + 1);
  const prev = () => { if (cur === 0) closeBook(); else turnTo(cur - 1); };

  /* ------------------------------------------------------------------ */
  /* intro camera (p: 0 closed on the desk .. 1 open, reading)           */
  /* ------------------------------------------------------------------ */
  let p = 0, pt = 0, mode = "intro", raf = 0, lastB = 0, lastC = 0, lastT = 0;
  function frameIntro(now) {
    raf = 0;
    // ease toward the target at the same speed whatever the frame rate
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 1 / 60;
    lastT = now;
    p += (pt - p) * (1 - Math.pow(1 - 0.09, dt * 60));
    if (Math.abs(pt - p) < 0.0008) p = pt;
    renderIntro();
    if (p !== pt) raf = requestAnimationFrame(frameIntro);
    else { lastT = 0; if (p >= 1) enterRead(); }
  }
  function go(v) {
    pt = clamp(v);
    if (mode === "read" && pt < 1) leaveRead();
    if (!raf) raf = requestAnimationFrame(frameIntro);
  }
  function renderIntro() {
    const { vw, vh, pw, ph, spread, barH, top } = G;
    const a = ease(seg(p, 0, 0.34));     // push in
    const b = ease(seg(p, 0.26, 0.7));   // cover opens
    const c = ease(seg(p, 0.6, 1));      // settle into reading position
    const D = window.__desk;
    const bw0 = Math.min(vw * 0.62, vh * 0.5, 430);
    let rx, rz, sc, cx0, cy0;
    if (D) {
      // wide, eye-level shot of the whole desk, then over it and down onto the book
      // desktop: the whole desk in frame. phones: a closer crop around the book
      const fit = vw >= 900 && G.fit;
      const wide0 = fit ? fit.sc : (0.36 * vw) / pw;
      rx = lerp(lerp(RX0, 26, a), 0, c);
      rz = lerp(lerp(0, -4, a), 0, c);
      sc = lerp(lerp(wide0, 0.92 * bw0 / pw, a), 1, c);
      cx0 = lerp(fit ? fit.cx : vw * 0.5, vw * 0.5, a) + (pw * sc / 2) * b;
      cy0 = lerp(fit ? fit.cy : vh * 0.6, vh * 0.5, a);
    } else {
      rx = lerp(lerp(56, 22, a), 0, c);
      rz = lerp(lerp(-15, -5, a), 0, c);
      sc = lerp(lerp(0.6 * bw0 / pw, 0.92 * bw0 / pw, a), 1, c);
      const wideStart = vw > 900 ? 0.14 : 0;
      cx0 = vw * lerp(0.5 + wideStart, 0.5, a) + (pw * sc / 2) * b;
      cy0 = vh * 0.5;
    }
    const cx = lerp(cx0, spread ? vw / 2 + pw / 2 : vw / 2, c);
    const cy = lerp(cy0, top + ph / 2, c);
    cam.style.transform =
      `translate3d(${(cx - pw / 2).toFixed(1)}px, ${(cy - ph / 2).toFixed(1)}px, 0) ` +
      `scale3d(${sc.toFixed(4)}, ${sc.toFixed(4)}, ${sc.toFixed(4)}) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
    root.style.setProperty("--open", (-180 * b).toFixed(2) + "deg");
    if ((b > 0.08 && lastB <= 0.08) || (b < 0.5 && lastB >= 0.5)) snd("cover");
    lastB = b; lastC = c;
    if (D) D.frame(p, a, b, c);
    card.style.opacity = (1 - seg(p, 0.04, 0.2)).toFixed(3);
    card.style.transform = `translateX(${(-40 * seg(p, 0.04, 0.2)).toFixed(1)}px)`;
    hint.style.opacity = (1 - seg(p, 0, 0.06)).toFixed(3);
    tip.style.opacity = (1 - seg(p, 0.5, 0.62)).toFixed(3);
    bars.forEach((el) => (el.style.transform = `scaleY(${(1 - c).toFixed(3)})`));
    stage.style.setProperty("--vig", (1 - c * 0.6).toFixed(3));
    stage.classList.toggle("moving", p > 0.01);
    skip.classList.toggle("gone", p > 0.9);
  }
  let hintShown = false, hinting = false;
  function enterRead() {
    mode = "read";
    setLeft(cur - 1);
    locked = true; acc = 0;
    clearTimeout(quietT);
    quietT = setTimeout(() => { locked = false; }, 400);
    root.classList.add("reading");
    stage.classList.add("reading");
    placeSound();
    after();
    if (!hintShown) {
      hintShown = true;
      hinting = true;
      countEl.textContent = G.vw < 900 ? "swipe to turn" : "scroll or \u2190 \u2192 to turn";
      setTimeout(() => { hinting = false; after(); }, 3200);
    }
  }
  function leaveRead() {
    mode = "intro";
    setLeft(-1); // the cover closes over the right page only: don't leave the left one lying on the desk
    if (location.hash) history.replaceState(null, "", location.pathname + location.search); // closed book: no page in the URL
    root.classList.remove("reading");
    stage.classList.remove("reading");
    placeSound();
  }
  function closeBook() { if (!busy) go(0); }
  function openBook() { go(1); }

  /* ------------------------------------------------------------------ */
  /* input: wheel, touch, keys, clicks                                   */
  /* ------------------------------------------------------------------ */
  let acc = 0, quietT = 0, locked = false;
  addEventListener("wheel", (e) => {
    e.preventDefault();
    const dy = (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : 1);
    if (mode === "intro") return; // the closed book opens on a click, not a scroll
    // one turn per gesture: wait for the wheel (and trackpad momentum) to go quiet
    clearTimeout(quietT);
    quietT = setTimeout(() => { locked = false; acc = 0; }, 170);
    if (locked) return;
    acc += dy;
    if (Math.abs(acc) > 45) {
      locked = true;
      acc > 0 ? next() : prev();
      acc = 0;
    }
  }, { passive: false });

  let tx0 = 0, ty0 = 0, tyLast = 0, tMoved = false;
  addEventListener("touchstart", (e) => {
    const t = e.touches[0]; tx0 = t.clientX; ty0 = tyLast = t.clientY; tMoved = false;
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    tyLast = t.clientY;
    e.preventDefault();
  }, { passive: false });
  addEventListener("touchend", (e) => {
    if (mode !== "read" || tMoved) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - tx0, dy = t.clientY - ty0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
    const fwd = Math.abs(dx) > Math.abs(dy) ? dx < 0 : dy < 0;
    fwd ? next() : prev();
  }, { passive: true });

  addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const fwdKeys = ["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"];
    const backKeys = ["ArrowLeft", "ArrowUp", "PageUp", "Backspace"];
    if (k === "Enter" && e.target.closest && e.target.closest("a, button")) return;
    if (k === "Escape" && mode === "read") { e.preventDefault(); e.stopPropagation(); closeBook(); return; } // back to the desk
    if (e.target.closest && e.target.closest("[data-keys]")) return; // a focused sketch wants the keys
    if (stage.classList.contains("desk-zoom")) return; // sat at the desk keyboard: keys are for the terminal
    if (fwdKeys.includes(k)) {
      e.preventDefault(); e.stopPropagation();
      if (mode === "read") next();
      else if (k === "Enter" || k === " ") openBook(); // keyboard users: Enter / Space open the book
    } else if (backKeys.includes(k)) {
      e.preventDefault(); e.stopPropagation();
      if (mode === "read") prev();
    } else if (k === "Home" && mode === "read") { e.preventDefault(); turnTo(0); }
    else if (k === "End" && mode === "read") { e.preventDefault(); turnTo(pages.length - 1); }
  }, true);

  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);
  btnToc.addEventListener("click", () => turnTo(0));
  // while reading: a way back to the desk (Esc does the same)
  const toDesk = document.createElement("button");
  toDesk.type = "button";
  toDesk.className = "to-desk";
  toDesk.innerHTML = "<kbd>esc</kbd> back to the desk";
  toDesk.setAttribute("aria-label", "Close the notebook and go back to the desk");
  toDesk.addEventListener("click", (e) => { e.stopPropagation(); closeBook(); });
  document.body.appendChild(toDesk);
  skip.addEventListener("click", (e) => { e.preventDefault(); p = pt = 1; renderIntro(); enterRead(); });

  // the closed book opens when it's clicked (or tapped)
  const overBook = (e) => { const r = book.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
  const closedOnDesk = () => mode === "intro" && pt === 0 && !stage.classList.contains("desk-zoom");
  stage.addEventListener("pointermove", (e) => stage.classList.toggle("over-book", closedOnDesk() && overBook(e)));
  stage.addEventListener("click", (e) => {
    if (closedOnDesk() && overBook(e)) { stage.classList.remove("over-book"); openBook(); }
  });
  const hintText = hint.firstChild;
  if (hintText && matchMedia("(hover: none)").matches) hintText.textContent = "tap the notebook to open ";

  // links inside pages: entries jump through the book; outside links behave
  stage.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (a) {
      const m = a.getAttribute("href").match(/entries\/(\d{3})[\w-]*\.html/);
      if (m && firstPage[m[1]] != null) { e.preventDefault(); turnTo(firstPage[m[1]]); }
      else if (/index\.html/.test(a.getAttribute("href"))) { e.preventDefault(); turnTo(0); }
      return;
    }
    if (mode !== "read" || busy || e.target.closest("button, .sketch")) return;
    // click the outer half of a page to turn it
    const r = slotR.getBoundingClientRect();
    if (e.clientX > r.left + r.width * 0.62 && e.clientX < r.right) next();
    else if (e.clientX < r.left && slotL.classList.contains("on")) prev();
  });

  /* ------------------------------------------------------------------ */
  /* boot                                                                */
  /* ------------------------------------------------------------------ */
  const startHash = location.hash;
  // the desk (js/desk.js) opens the notebook at an entry
  window.__book = {
    openAt(id) {
      if (!ready || firstPage[id] == null) return;
      if (mode === "read") { turnTo(firstPage[id]); return; }
      show(firstPage[id]);
      go(1);
    },
  };
  // phones: the sound button rides in the reader bar while reading
  const st = $(".sound-toggle");
  const placeSound = () => {
    if (!st) return;
    const inBar = mode === "read" && G.vw < 900;
    if (inBar && st.parentNode !== bar) bar.appendChild(st);
    if (!inBar && st.parentNode === bar) document.body.appendChild(st);
  };
  geometry();
  docs.push(contentsDoc());
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => { paginate(); show(0); ready = true; if (window.__desk) G.fit = fitDesk(); layoutCard(); renderIntro(); });
  renderIntro();

  Promise.all([fetchEntries(), fontsReady]).then(([entries]) => {
    docs.push(...entries);
    paginate();
    // a shared entry link opens the book at that entry; anything else
    // (a plain visit, a refresh) starts at the closed book on the desk
    const m = startHash.match(/^#entry-(\d{3})/);
    const want = m && firstPage[m[1]] != null ? firstPage[m[1]] : cur;
    show(want);
    ready = true;
    if (startHash) history.replaceState(null, "", location.pathname + location.search);
    if (m || STILL) { p = pt = 1; renderIntro(); enterRead(); }
  });

  addEventListener("hashchange", () => {
    const m = location.hash.match(/^#entry-(\d{3})/);
    const t = m && firstPage[m[1]] != null ? firstPage[m[1]] : location.hash === "#contents" ? 0 : null;
    if (t == null) return;
    if (mode !== "read") { p = pt = 1; renderIntro(); enterRead(); }
    if (t !== cur) turnTo(t);
  });

  let rT = 0;
  addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      const keep = pages[cur] ? { id: pages[cur].d.id, k: pages[cur].k } : null;
      geometry();
      paginate();
      let i = 0;
      if (keep) i = Math.min((firstPage[keep.id] ?? 0) + keep.k, pages.length - 1);
      show(i);
      renderIntro();
      placeSound();
    }, 150);
  });

  // GTA-style loading tips, all straight from the entries
  const tips = [
    "Hot glue is not a structural material.",
    "Cheap sensors lie. Math makes them honest.",
    "If you build on something you don't control, it will change without asking you.",
    "Big servos don't run on Arduino power.",
    "A gripper has to be designed, not improvised.",
  ];
  const tipText = tip.querySelector("span");
  let ti = 0;
  setInterval(() => {
    if (document.hidden || mode === "read") return;
    tipText.style.opacity = 0;
    setTimeout(() => { ti = (ti + 1) % tips.length; tipText.textContent = tips[ti]; tipText.style.opacity = 1; }, 300);
  }, 4200);
})();
