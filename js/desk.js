/* Karan's desk, in 3D: the workbench the notebook lies on in the intro.
   A hybrid of his lab workstation (shelf with his name on it, two monitors,
   tower, keyboard, cube, coffee, watch) and his soldering desk (green
   cutting mat, iron on the right, wire spools, parts organiser on the left).

   Rendered with three.js into a canvas behind the (CSS 3D) notebook. The
   three.js camera copies the CSS camera exactly: same perspective (1500px,
   origin 50% 40%) and the same transform book.js writes on .cam, so desk
   and notebook move as one.

   Units are "desk px": the desk is 3400 wide (x, left to right) and 2200
   deep (y, back to front); z is height. The notebook lies at x 1415..1985,
   y 900..(900 + its height). In three.js a desk point (x, y, z) is placed
   at (x, -y, z); V() does that.

   Interactive: lamp (night mode) · terminal (left monitor) · live NDVI plot
   (right monitor, entry 016) · rubik's cube (drag to spin, click to
   scramble / solve, real layer turns) · coffee (sip) · watch (real time) ·
   keyboard (echoes your keys) · mouse (follows yours) · soldering iron
   (heat) · arduino (LED patterns) · multimeter (reads pin 13) · wire spools
   (drag down to pull) · glue gun / drone / satellite (open entries 001 /
   008 / 009) · organiser drawers · shelf label.

   book.js calls window.__desk.frame(p, a, b, c) whenever the camera moves. */
(function () {
  "use strict";
  const root = document.documentElement;
  if (!root.classList.contains("book-on")) return;
  const stage = document.querySelector(".intro-stage"), camEl = document.querySelector(".cam");
  if (!stage || !camEl) return;
  const BASE = document.currentScript ? document.currentScript.src : location.href;
  const PHONE = innerWidth < 900;

  const fx = (k) => window.NotebookSound && window.NotebookSound.fx && window.NotebookSound.fx(k);
  let zoomExit = null; // set once the scene exists: leaves the keyboard close-up, then calls back
  const openAt = (id) => { const go = () => window.__book && window.__book.openAt(id); if (!(zoomExit && zoomExit(go))) go(); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let ready = false, active = true, cParam = 0, pParam = 0, dirty = true;
  let syncCamera = () => {}, render = () => {}, tallVisible = () => {}, wake = () => {};

  /* screen-space bits */
  const canvas = document.createElement("canvas");
  canvas.className = "desk-gl";
  canvas.setAttribute("aria-hidden", "true");
  stage.insertBefore(canvas, stage.firstChild);
  const tipEl = document.createElement("div");
  tipEl.className = "desk-tip";
  stage.appendChild(tipEl);
  const input = document.createElement("input");
  input.className = "desk-input";
  input.setAttribute("data-keys", "");
  input.setAttribute("aria-label", "desk terminal");
  input.autocomplete = "off";
  input.spellcheck = false;
  stage.appendChild(input);
  const refill = document.createElement("div");
  refill.className = "desk-bubble";
  refill.textContent = "refill?";
  stage.appendChild(refill);

  window.__desk = {
    frame(p, a, b, c) {
      cParam = c; pParam = p;
      const was = active;
      active = c < 1;
      dirty = true;
      if (ready) { syncCamera(); tallVisible(c < 0.3); render(); }
      if (p > 0.005) tipEl.classList.remove("on"); // labels only while the desk sits still
      if (active && !was) wake();
      if (!active && document.activeElement === input) input.blur();
      stage.classList.toggle("desk-live", active);
    },
  };

  const hasGL = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (_) { return false; } })();
  if (!hasGL) { root.classList.add("desk-flat"); return; }

  import(new URL("vendor/three-r169-9d8a0bf2.min.js", BASE).href).then((THREE) => {
    build(THREE);
    ready = true;
    syncCamera(); tallVisible(cParam < 0.3); render();
    // reveal from wherever the notebook sits on screen, outwards
    const br = document.querySelector(".book").getBoundingClientRect();
    canvas.style.setProperty("--rx", ((br.left + br.width / 2) / innerWidth * 100).toFixed(1) + "%");
    canvas.style.setProperty("--ry", ((br.top + br.height / 2) / innerHeight * 100).toFixed(1) + "%");
    const revealed = () => canvas.classList.add("revealed");
    canvas.addEventListener("animationend", revealed, { once: true });
    setTimeout(revealed, 2200); // in case the animation never runs
    canvas.classList.add("on");
    wake();
  }).catch((err) => { console.warn("desk:", err); root.classList.add("desk-flat"); });

  /* ================================================================== */
  function build(T) {
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, PHONE ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene();
    scene.background = new T.Color(0x24211d);
    const camera = new T.PerspectiveCamera();
    camera.matrixAutoUpdate = false;
    camera.matrixWorldAutoUpdate = false;
    const raycaster = new T.Raycaster();

    /* ---------- a soft studio environment, for reflections ---------- */
    {
      const pm = new T.PMREMGenerator(renderer);
      const env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x6b6660, side: T.BackSide })));
      const panel = (x, y, z, w, h, k) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(k, k, k * 0.95), side: T.DoubleSide }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
      };
      panel(0, 0, 4.9, 6, 6, 3); panel(-4.9, 1, 1, 3, 4, 1.6); panel(4.9, -1, 2, 3, 3, 1.2);
      scene.environment = pm.fromScene(env, 0.04).texture;
      scene.environmentIntensity = 0.55;
      pm.dispose();
    }

    /* ---------- helpers ---------- */
    const V = (x, y, z = 0) => new T.Vector3(x, -y, z);
    const std = (color, rough = 0.6, metal = 0, extra = {}) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
    const put = (obj, x, y, z = 0, parent = scene) => { obj.position.copy(V(x, y, z)); parent.add(obj); return obj; };
    const shadow = (o, cast = true, recv = true) => { o.traverse((n) => { if (n.isMesh) { n.castShadow = cast; n.receiveShadow = recv; } }); return o; };
    /* rounded box: w along x, d along y, h along z; bottom on z = 0 */
    function rboxGeo(w, d, h, r) {
      r = Math.max(0.5, Math.min(r, w / 2 - 0.5, d / 2 - 0.5, h / 2 - 0.5));
      const b = r * 0.7, rr = Math.max(0.5, r - b), W = w - 2 * b, D = d - 2 * b;
      const s = new T.Shape(), x = -W / 2, y = -D / 2;
      s.moveTo(x + rr, y); s.lineTo(x + W - rr, y); s.quadraticCurveTo(x + W, y, x + W, y + rr);
      s.lineTo(x + W, y + D - rr); s.quadraticCurveTo(x + W, y + D, x + W - rr, y + D);
      s.lineTo(x + rr, y + D); s.quadraticCurveTo(x, y + D, x, y + D - rr);
      s.lineTo(x, y + rr); s.quadraticCurveTo(x, y, x + rr, y);
      const g = new T.ExtrudeGeometry(s, { depth: Math.max(0.1, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 4 });
      g.translate(0, 0, b);
      return g;
    }
    const rbox = (w, d, h, r, m) => shadow(new T.Mesh(rboxGeo(w, d, h, r), m));
    const box = (w, d, h, m) => { const g = new T.BoxGeometry(w, d, h); g.translate(0, 0, h / 2); return shadow(new T.Mesh(g, m)); };
    const cylZ = (rt, rb, h, m, seg = 32) => { const g = new T.CylinderGeometry(rt, rb, h, seg); g.rotateX(Math.PI / 2); g.translate(0, 0, h / 2); return shadow(new T.Mesh(g, m)); };
    const UPY = new T.Vector3(0, 1, 0);
    function rod(a, b, r, m, seg = 16) {
      const A = V(...a), B = V(...b);
      const mesh = shadow(new T.Mesh(new T.CylinderGeometry(r, r, A.distanceTo(B), seg), m));
      mesh.position.copy(A).add(B).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(UPY, B.clone().sub(A).normalize());
      return mesh;
    }
    const tube = (pts, r, m, seg = 40) => shadow(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map((p) => V(...p))), seg, r, 8, false), m));
    function lathe(profile, m, seg = 40) {
      const g = new T.LatheGeometry(profile.map(([r, z]) => new T.Vector2(r, z)), seg);
      g.rotateX(Math.PI / 2);
      return shadow(new T.Mesh(g, m));
    }
    /* a plane standing up, facing the front of the desk */
    function front(w, h, mat) { const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.rotation.x = Math.PI / 2; return m; }
    function tex(w, h, draw) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      const t = new T.CanvasTexture(c);
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = 8;
      t.userData = { g, w, h, draw };
      if (draw) draw(g, w, h);
      return t;
    }
    const redraw = (t, draw) => { const { g, w, h } = t.userData; if (draw) t.userData.draw = draw; t.userData.draw(g, w, h); t.needsUpdate = true; dirty = true; };
    const hand = (px) => `${px}px Caveat, "Comic Sans MS", cursive`;
    const glow = (map) => new T.MeshBasicMaterial({ map, toneMapped: false });

    /* interactive things */
    const hits = [];
    /* discovery: every clickable thing a visitor has found, remembered in this browser */
    const known = new Set();
    let foundSet = new Set();
    try { foundSet = new Set(JSON.parse(localStorage.getItem("nb-found") || "[]")); } catch (_) {}
    let onFound = () => {};
    const keyOf = (tip) => String(tip).replace(/<[^>]+>/g, "").split("\u00B7")[0].split("·")[0].trim().toLowerCase();
    function found(k) {
      if (!k || foundSet.has(k)) return;
      foundSet.add(k);
      try { localStorage.setItem("nb-found", JSON.stringify([...foundSet])); } catch (_) {}
      onFound(k);
    }
    const hot = (obj, tip, click, extra = {}) => {
      const k = extra.find || keyOf(tip);
      const counts = (click || extra.find) && !extra.noFind; // noFind: helpers like the sticky note aren't "things"
      if (counts) known.add(k);
      const fire = click && counts ? () => { found(k); click(); } : click;
      obj.traverse((m) => { if (m.isMesh) { m.userData.tip = tip; m.userData.click = fire; Object.assign(m.userData, extra); hits.push(m); } });
      return obj;
    };
    const retip = (obj, tip) => obj.traverse((m) => { if (m.isMesh) m.userData.tip = tip; });
    const tall = new T.Group(); // hidden once the camera is overhead
    scene.add(tall);

    /* ---------- lights ---------- */
    const hemi = new T.HemisphereLight(0xfff4e6, 0x3a3630, 1.1);
    scene.add(hemi);
    const key = new T.DirectionalLight(0xfff1dc, 2.2);
    key.position.copy(V(900, -1400, 3200));
    key.target.position.copy(V(1700, 1100, 0));
    key.castShadow = true;
    key.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -2300, right: 2300, top: 2300, bottom: -2300, near: 100, far: 7000 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 1.5;
    scene.add(key, key.target);

    /* ================================================================ */
    /* desk + cutting mat                                                */
    /* ================================================================ */
    put(rbox(3400, 2200, 70, 10, std(0xe4e1da, 0.75)), 1700, 1100, -70);
    const matTex = tex(2048, 1310, (g, w, h) => {
      const k = w / 3330;
      g.fillStyle = "#2f6d53"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.03})`;
        g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 30, 2 + Math.random() * 30);
      }
      const o = 70 * k, cm = 40 * k;
      for (let x = o, i = 0; x < w; x += cm, i++) { g.fillStyle = `rgba(255,255,255,${i % 5 ? 0.12 : 0.32})`; g.fillRect(x, 0, i % 5 ? 1.2 : 2.4, h); }
      for (let y = o, i = 0; y < h; y += cm, i++) { g.fillStyle = `rgba(255,255,255,${i % 5 ? 0.12 : 0.32})`; g.fillRect(0, y, w, i % 5 ? 1.2 : 2.4); }
      g.fillStyle = "rgba(255,255,255,.55)";
      for (let x = o, i = 0; x < w; x += cm / 2, i++) { const l = (i % 10 ? 10 : 22) * k * 2; g.fillRect(x, h - l, 1.4, l); }
      for (let y = o, i = 0; y < h; y += cm / 2, i++) g.fillRect(0, y, (i % 10 ? 10 : 22) * k * 2, 1.4);
      g.font = `600 ${Math.round(34 * k)}px system-ui, sans-serif`;
      g.fillStyle = "rgba(255,255,255,.6)";
      for (let i = 1; i <= 16; i++) g.fillText(String(i * 5), o + i * 200 * k - 10, h - 60 * k);
      for (let i = 1; i <= 10; i++) g.fillText(String(i * 5), 40 * k, o + i * 200 * k + 8);
      g.strokeStyle = "rgba(255,255,255,.2)"; g.lineWidth = 2; g.setLineDash([10, 9]);
      const ox = 36 * k, oy = h - 36 * k;
      [[1864, 1864], [1074, 1860], [2864, 790]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + dx * k, oy - dy * k); g.stroke(); });
      g.beginPath(); g.arc(ox, oy, 600 * k, -Math.PI / 2, 0); g.stroke();
      g.setLineDash([]);
    });
    const matMesh = new T.Mesh(rboxGeo(3330, 2130, 5, 10), [std(0xffffff, 0.88, 0, { map: matTex }), std(0x2a5f48, 0.9)]);
    {
      const uv = matMesh.geometry.attributes.uv, pos = matMesh.geometry.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 1665) / 3330, (pos.getY(i) + 1065) / 2130);
    }
    matMesh.receiveShadow = true;
    put(matMesh, 1700, 1100, 0);
    const TOP = 5; // the mat's surface

    /* the notebook's contact shadow (the notebook itself is HTML, drawn on top) */
    const bookShadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({
      map: tex(256, 256, (g, w, h) => {
        const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
        grd.addColorStop(0, "rgba(0,0,0,.55)"); grd.addColorStop(0.75, "rgba(0,0,0,.35)"); grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
      }), transparent: true, depthWrite: false,
    }));
    scene.add(bookShadow);
    function placeBookShadow() {
      const cs = getComputedStyle(root);
      const ds = (parseFloat(cs.getPropertyValue("--pw")) || 570) / 570, bh = (parseFloat(cs.getPropertyValue("--ph")) || 806) / ds;
      bookShadow.scale.set(650, bh + 70, 1);
      bookShadow.position.copy(V(1720, 900 + bh / 2 + 24, TOP + 0.6));
    }

    /* ================================================================ */
    /* back wall + shelf with his name on it                             */
    /* ================================================================ */
    /* ---------- the room around the desk ---------- */
    // desk units: ~2 per mm. Floor 75 cm under the desk top, walls either side.
    const FLOOR = -1570, RL = -20, RR = 4900, RF = 6000, CEIL = 4200;
    const seeded = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    function plasterTex(base, rx, ry) {
      const t = tex(512, 512, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 14000; i++) {
          g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "60,50,40"},${Math.random() * 0.035})`;
          g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
        }
      });
      t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    }
    /* a plane in a side wall: w along the desk's depth, h up; dir +1 faces right (+x), -1 faces left */
    function sidePlane(w, h, mat, dir) {
      const g = new T.PlaneGeometry(w, h);
      g.rotateX(Math.PI / 2); g.rotateZ(dir * Math.PI / 2);
      return new T.Mesh(g, mat);
    }
    const wallMat = std(0xffffff, 0.95, 0, { map: plasterTex("#e6e2d8", 6, 4) });
    const wall = front(RR - RL, CEIL - FLOOR, wallMat);
    wall.position.copy(V((RL + RR) / 2, -10, (FLOOR + CEIL) / 2));
    wall.receiveShadow = true;
    tall.add(wall);
    const sideMat = std(0xffffff, 0.95, 0, { map: plasterTex("#ddd8cc", 5, 4) });
    const lWall = sidePlane(RF + 10, CEIL - FLOOR, sideMat, 1);
    lWall.position.copy(V(RL, (RF - 10) / 2, (FLOOR + CEIL) / 2)); tall.add(lWall);
    const rWall = sidePlane(RF + 10, CEIL - FLOOR, sideMat, -1);
    rWall.position.copy(V(RR, (RF - 10) / 2, (FLOOR + CEIL) / 2)); tall.add(rWall);
    // wooden floor, planks running front to back
    const floorTex = tex(1024, 1024, (g, w, h) => {
      const r = seeded(7), n = 8, pw = w / n;
      for (let i = 0; i < n; i++) {
        const tone = 120 + r() * 40;
        g.fillStyle = `rgb(${tone + 30},${tone * 0.78 + 10},${tone * 0.55})`;
        g.fillRect(i * pw, 0, pw, h);
        for (let k = 0; k < 40; k++) { // grain
          g.strokeStyle = `rgba(60,35,15,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 2;
          const x = i * pw + r() * pw;
          g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + r() * 10 - 5, h / 3, x + r() * 10 - 5, h * 2 / 3, x + r() * 6 - 3, h); g.stroke();
        }
        g.fillStyle = "rgba(40,22,10,.55)"; g.fillRect(i * pw, 0, 2, h);
        const cut = r() * h; g.fillRect(i * pw, cut, pw, 2);
      }
    });
    floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping; floorTex.repeat.set(3, 2);
    const floor = new T.Mesh(new T.PlaneGeometry(RR - RL, RF + 10), std(0xffffff, 0.7, 0, { map: floorTex }));
    floor.position.copy(V((RL + RR) / 2, (RF - 10) / 2, FLOOR)); floor.receiveShadow = true;
    tall.add(floor);
    // skirting boards
    const skirt = std(0xf2efe8, 0.6);
    put(box(RR - RL, 16, 130, skirt), (RL + RR) / 2, -2, FLOOR, tall);
    put(box(16, RF, 130, skirt), RL + 8, RF / 2, FLOOR, tall);
    put(box(16, RF, 130, skirt), RR - 8, RF / 2, FLOOR, tall);
    // desk legs
    const legMat = std(0x2b2b2d, 0.45, 0.6);
    [[90, 120], [3310, 120], [90, 2080], [3310, 2080]].forEach(([x, y]) => put(box(70, 70, -70 - FLOOR, legMat), x, y, FLOOR, tall));
    put(box(3220, 50, 90, legMat), 1700, 120, -160, tall);
    // a socket and a switch on the back wall, the tower plugged in
    const plate = std(0xf7f6f2, 0.4);
    // a double outlet: the tower in one, the 3D printer in the other
    put(rbox(170, 14, 330, 10, plate), 3390, -2, 120, tall);
    [205, 365].forEach((z) => put(rbox(110, 8, 110, 8, std(0xeeece6, 0.45)), 3390, 6, z - 55, tall));
    const plugM = std(0x222222, 0.5), cordM = std(0x1a1a1a, 0.6);
    put(rbox(60, 40, 60, 6, plugM), 3390, 10, 335, tall);
    put(rbox(60, 40, 60, 6, plugM), 3390, 10, 175, tall);
    tall.add(tube([[3390, 50, 365], [3360, 140, 330], [3300, 280, 200], [3230, 330, 120]], 7, cordM, 30)); // the tower
    tall.add(tube([[3390, 50, 205], [3430, 110, 130], [3500, 120, 40], [3540, 130, 30]], 7, cordM, 20)); // the 3D printer

    /* ---------- the window on the right wall: sky follows the visitor's clock ---------- */
    const WY0 = 350, WY1 = 1550, WZ0 = 450, WZ1 = 2300, WX = RR - 4;
    const skyTex = tex(512, 720, () => {});
    let skyNight = false;
    function paintSky() {
      const hr = new Date().getHours() + new Date().getMinutes() / 60;
      const dark = skyNight || hr < 5.5 || hr >= 19.5;
      const dusk = !dark && (hr < 7.5 || hr >= 17.5);
      redraw(skyTex, (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h);
        if (dark) { grd.addColorStop(0, "#070b1c"); grd.addColorStop(1, "#1b2442"); }
        else if (dusk) { grd.addColorStop(0, "#3b4f86"); grd.addColorStop(0.55, "#e58a6b"); grd.addColorStop(1, "#f7c88a"); }
        else { grd.addColorStop(0, "#5f9fd8"); grd.addColorStop(1, "#cfe6f4"); }
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        const r = seeded(3);
        if (dark) {
          for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.7})`; g.fillRect(r() * w, r() * h * 0.7, 1.6, 1.6); }
          g.fillStyle = "#f4efd8"; g.beginPath(); g.arc(w * 0.68, h * 0.2, 26, 0, 7); g.fill();
          g.fillStyle = "#0a0f24"; g.beginPath(); g.arc(w * 0.68 + 12, h * 0.2 - 6, 24, 0, 7); g.fill();
        } else {
          for (let i = 0; i < 5; i++) { // soft clouds
            const cx = r() * w, cy = 60 + r() * h * 0.45;
            g.fillStyle = dusk ? "rgba(255,200,180,.35)" : "rgba(255,255,255,.75)";
            for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx + (k - 3) * 22, cy + r() * 14, 40 + r() * 30, 16 + r() * 10, 0, 0, 7); g.fill(); }
          }
        }
        // rooftops and a tree across the street
        g.fillStyle = dark ? "#05070f" : dusk ? "#5b4152" : "#7d8f9c";
        const r2 = seeded(11); let x = 0;
        while (x < w) { const bw = 60 + r2() * 110, bh = 110 + r2() * 190; g.fillRect(x, h - bh, bw - 6, bh); x += bw; }
        if (dark) { g.fillStyle = "#f7d27a"; for (let i = 0; i < 16; i++) g.fillRect(r2() * w, h - 40 - r2() * 220, 9, 12); }
        g.fillStyle = dark ? "#03050a" : dusk ? "#3d2c38" : "#4f6b4a";
        for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(70 + r2() * 90, h - 230 + r2() * 90, 50 + r2() * 30, 0, 7); g.fill(); }
        g.fillRect(110, h - 200, 18, 200);
      });
    }
    const glass = sidePlane(WY1 - WY0, WZ1 - WZ0, new T.MeshBasicMaterial({ map: skyTex, toneMapped: false }), -1);
    glass.position.copy(V(WX + 2, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2)); tall.add(glass);
    const frameMat = std(0xf4f2ec, 0.45);
    const bar = (y0, y1, z0, z1) => put(box(40, y1 - y0, z1 - z0, frameMat), WX - 18, (y0 + y1) / 2, z0, tall);
    bar(WY0 - 60, WY0, WZ0 - 60, WZ1 + 60); bar(WY1, WY1 + 60, WZ0 - 60, WZ1 + 60);
    bar(WY0, WY1, WZ0 - 60, WZ0); bar(WY0, WY1, WZ1, WZ1 + 60);
    bar((WY0 + WY1) / 2 - 18, (WY0 + WY1) / 2 + 18, WZ0, WZ1); bar(WY0, WY1, (WZ0 + WZ1) / 2 + 200, (WZ0 + WZ1) / 2 + 236);
    put(box(110, WY1 - WY0 + 220, 28, frameMat), WX - 55, (WY0 + WY1) / 2, WZ0 - 88, tall); // sill
    put(rbox(60, 60, 110, 8, std(0xb5643c, 0.8)), WX - 60, WY0 + 120, WZ0 - 60, tall); // a little pot on the sill
    const leaf = std(0x4f8a3c, 0.7);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; tall.add(rod([WX - 60, WY0 + 120, WZ0 + 40], [WX - 60 + Math.cos(a) * 60, WY0 + 120 + Math.sin(a) * 60, WZ0 + 120 + (i % 3) * 30], 9, leaf, 8)); }
    // a curtain gathered at the front edge of the window
    {
      const cw = 300, ch = WZ1 - WZ0 + 400, g = new T.PlaneGeometry(cw, ch, 48, 1);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / cw * Math.PI * 7) * 26);
      g.computeVertexNormals();
      g.rotateX(Math.PI / 2); g.rotateZ(-Math.PI / 2);
      const cur = shadow(new T.Mesh(g, std(0xc9b48c, 0.9, 0, { side: T.DoubleSide })), false, true);
      cur.position.copy(V(WX - 70, WY0 - 40 - cw / 2, WZ0 - 200 + ch / 2)); tall.add(cur);
      tall.add(rod([WX - 70, WY0 - 200, WZ1 + 230], [WX - 70, WY1 + 520, WZ1 + 230], 12, std(0x8a8f96, 0.35, 0.8)));
    }
    // daylight from the window
    const winLight = new T.DirectionalLight(0xdfeaff, 0.5);
    winLight.position.copy(V(RR + 2000, 1500, 2600)); winLight.target.position.copy(V(1700, 1100, 0));
    scene.add(winLight, winLight.target);

    /* ---------- wall calendar: past days crossed off in red marker ---------- */
    const CW = 520, CH = 780, CX = 4620, CZ = 560; // CZ = bottom edge
    const calTex = tex(800, 1200, () => {});
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function marker(g, r, x0, y0, x1, y1, wdt) {
      // one felt-tip stroke: a slightly bowed line, thicker where it starts, a few passes so it isn't clean
      const mx = (x0 + x1) / 2 + (r() - 0.5) * 18, my = (y0 + y1) / 2 + (r() - 0.5) * 18;
      g.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const o = () => (r() - 0.5) * 3;
        g.strokeStyle = `rgba(200,30,28,${0.5 + r() * 0.3})`;
        g.lineWidth = wdt * (0.7 + r() * 0.5);
        g.beginPath(); g.moveTo(x0 + o(), y0 + o()); g.quadraticCurveTo(mx + o(), my + o(), x1 + o(), y1 + o()); g.stroke();
      }
    }
    function paintCalendar() {
      const now = new Date(), Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
      redraw(calTex, (g, w, h) => {
        g.fillStyle = "#f5f1e6"; g.fillRect(0, 0, w, h);
        // top half: a printed picture, two-colour riso look
        const ph = 470, r0 = seeded(Y * 13 + M);
        g.fillStyle = "#e9dcc0"; g.fillRect(30, 70, w - 60, ph - 70);
        g.fillStyle = "#e27d4f"; g.beginPath(); g.arc(w * (0.3 + r0() * 0.4), 200, 70, 0, 7); g.fill();
        [["#4b7a8c", 330], ["#2f4e5c", 380]].forEach(([c, base]) => {
          g.fillStyle = c; g.beginPath(); g.moveTo(30, ph);
          for (let x = 30; x <= w - 30; x += 40) g.lineTo(x, base - r0() * 90);
          g.lineTo(w - 30, ph); g.fill();
        });
        // the wire binding
        g.fillStyle = "#5a5a5a"; for (let x = 60; x < w - 40; x += 34) g.fillRect(x, 18, 10, 40);
        g.fillStyle = "#2b2b2b"; g.font = "700 64px Georgia, serif"; g.textAlign = "left";
        g.fillText(MONTHS[M].toUpperCase(), 40, ph + 80);
        g.font = "400 44px Georgia, serif"; g.textAlign = "right"; g.fillStyle = "#b03a2e";
        g.fillText(String(Y), w - 40, ph + 80);
        // the grid, weeks start on Monday
        const gx = 40, gy = ph + 120, cw = (w - 80) / 7, rows = 6, chh = (h - gy - 30) / (rows + 0.4);
        g.font = "600 24px system-ui, sans-serif"; g.textAlign = "center"; g.fillStyle = "#777";
        "MTWTFSS".split("").forEach((c, i) => g.fillText(c, gx + cw * (i + 0.5), gy + 22));
        const top = gy + chh * 0.4, first = (new Date(Y, M, 1).getDay() + 6) % 7, days = new Date(Y, M + 1, 0).getDate();
        g.strokeStyle = "rgba(0,0,0,.15)"; g.lineWidth = 1.5;
        for (let i = 0; i <= rows; i++) { g.beginPath(); g.moveTo(gx, top + i * chh); g.lineTo(w - gx, top + i * chh); g.stroke(); }
        for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(gx + i * cw, top); g.lineTo(gx + i * cw, top + rows * chh); g.stroke(); }
        g.font = "500 30px Georgia, serif"; g.textAlign = "left";
        for (let d = 1; d <= days; d++) {
          const c = (first + d - 1) % 7, row = Math.floor((first + d - 1) / 7);
          const x = gx + c * cw, y = top + row * chh;
          g.fillStyle = c === 6 ? "#b03a2e" : "#333";
          g.fillText(String(d), x + 8, y + 32);
          const r = seeded(Y * 400 + M * 32 + d);
          if (d < D) {
            // a hasty X: two strokes of different length and angle, never quite corner to corner
            const p = (a) => a + (r() - 0.5) * 16;
            marker(g, r, x + p(14), y + p(14), x + cw - p(12), y + chh - p(10), 6);
            marker(g, r, x + cw - p(18), y + p(20), x + p(22), y + chh - p(16), 5.5);
          } else if (d === D) {
            // today: circled, the loop overshoots where it closes
            g.strokeStyle = "rgba(200,30,28,.8)"; g.lineWidth = 5; g.lineCap = "round"; g.beginPath();
            const cx = x + cw / 2, cy = y + chh / 2, rx = cw * 0.44, ry = chh * 0.4, a0 = -2.2 + r() * 0.5;
            for (let a = 0; a <= Math.PI * 2.25; a += 0.08) {
              const k = 1 + a * 0.025 + Math.sin(a * 3) * 0.02;
              g.lineTo(cx + Math.cos(a + a0) * rx * k, cy + Math.sin(a + a0) * ry * k);
            }
            g.stroke();
          }
        }
      });
    }
    const calGrp = put(new T.Group(), CX, -6, CZ, tall);
    {
      const sheet = front(CW, CH, std(0xffffff, 0.85, 0, { map: calTex }));
      sheet.position.z = CH / 2; sheet.position.y = -14; sheet.receiveShadow = true; sheet.castShadow = true;
      calGrp.add(sheet);
      calGrp.add(shadow(new T.Mesh(new T.BoxGeometry(CW - 20, 10, CH - 20), std(0xd9d2c0, 0.9)).translateZ(CH / 2).translateY(-6)));
      calGrp.rotation.y = 0.025;
      // the nail and the string it hangs from
      const nail = put(cylZ(7, 7, 30, std(0x888888, 0.3, 0.9)), CX, 30, CZ + CH + 150, tall); nail.rotation.x = Math.PI / 2;
      const str = std(0x3a3a3a, 0.8);
      tall.add(rod([CX, -20, CZ + CH + 150], [CX - CW / 2 + 60, -20, CZ + CH - 10], 2.5, str, 6));
      tall.add(rod([CX, -20, CZ + CH + 150], [CX + CW / 2 - 60, -20, CZ + CH - 10], 2.5, str, 6));
    }
    const calTip = () => { const n = new Date(); return `calendar · ${n.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, ${n.getDate() - 1} crossed off`; };
    hot(calGrp, calTip());

    /* ---------- a wall clock beside the calendar, set to the visitor's time ---------- */
    const clockTex = tex(512, 512, () => {});
    function paintClock() {
      const n = new Date(), hh = n.getHours() % 12 + n.getMinutes() / 60, mm = n.getMinutes();
      redraw(clockTex, (g, w) => {
        const c = w / 2;
        g.clearRect(0, 0, w, w);
        g.fillStyle = "#fbfaf6"; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
        g.fillStyle = "#222";
        for (let i = 0; i < 60; i++) {
          const a = i / 60 * Math.PI * 2, l = i % 5 ? 14 : 34;
          g.save(); g.translate(c, c); g.rotate(a); g.fillRect(i % 5 ? -2 : -5, -c + 22, i % 5 ? 4 : 10, l); g.restore();
        }
        const handAt = (a, len, wdt) => { g.save(); g.translate(c, c); g.rotate(a); g.fillRect(-wdt / 2, -len, wdt, len + 24); g.restore(); };
        handAt(hh / 12 * Math.PI * 2, c * 0.5, 14);
        handAt(mm / 60 * Math.PI * 2, c * 0.75, 9);
        g.beginPath(); g.arc(c, c, 14, 0, 7); g.fill();
      });
    }
    const clock = put(new T.Group(), 4620, -6, 1610, tall);
    clock.scale.setScalar(0.6);
    {
      const rim = cylZ(170, 170, 40, std(0x2a2a2a, 0.4, 0.3), 48); rim.rotation.x = Math.PI / 2; rim.position.z = 0; clock.add(rim);
      const face = front(320, 320, new T.MeshStandardMaterial({ map: clockTex, transparent: true, roughness: 0.5 }));
      face.position.y = -42; clock.add(face);
    }
    paintSky(); paintCalendar(); paintClock();
    let lastDay = new Date().getDate();
    setInterval(() => {
      if (document.hidden) return;
      paintClock();
      const d = new Date().getDate();
      if (d !== lastDay) { lastDay = d; paintCalendar(); retip(calGrp, calTip()); }
      if (new Date().getMinutes() % 10 === 0) paintSky();
    }, 60000);

    /* ---------- the right corner: whiteboard, printer cart, broken-parts bin, plant ---------- */
    // whiteboard on the back wall; click wipes it and draws the next one
    const WB = { y0: 1700, y1: 2540, z0: 520, z1: 1108 }; // on the right wall, in front of the window; same aspect as its 1000x700 texture
    const BOARDS = [
      (g, w, h) => { // PID loop
        const blk = (x, y, bw, bh, txt, c = "#1d2f6f") => { g.strokeStyle = c; g.lineWidth = 4; g.strokeRect(x, y, bw, bh); g.fillStyle = c; g.font = hand(40); g.textAlign = "center"; g.fillText(txt, x + bw / 2, y + bh / 2 + 13); };
        const arrow = (x0, y0, x1, y1, c = "#1d2f6f") => {
          g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
          const a = Math.atan2(y1 - y0, x1 - x0); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 16 * Math.cos(a - 0.4), y1 - 16 * Math.sin(a - 0.4)); g.lineTo(x1 - 16 * Math.cos(a + 0.4), y1 - 16 * Math.sin(a + 0.4)); g.fill();
        };
        g.fillStyle = "#1d2f6f"; g.font = hand(44); g.textAlign = "left"; g.fillText("r", 40, 205);
        arrow(70, 192, 150, 192);
        g.strokeStyle = "#1d2f6f"; g.lineWidth = 4; g.beginPath(); g.arc(175, 192, 25, 0, 7); g.stroke();
        g.font = hand(34); g.fillText("+", 128, 180); g.fillText("−", 180, 250);
        arrow(200, 192, 290, 192); g.font = hand(36); g.fillText("e", 232, 180);
        blk(290, 142, 270, 100, "Kp + Ki/s + Kd·s");
        arrow(560, 192, 640, 192); g.fillText("u", 590, 180);
        blk(640, 152, 160, 80, "G(s)");
        arrow(800, 192, 900, 192); g.font = hand(44); g.fillText("y", 910, 205);
        g.lineWidth = 3.5; g.beginPath(); g.moveTo(850, 192); g.lineTo(850, 320); g.lineTo(175, 320); g.stroke(); arrow(175, 320, 175, 218);
        // a step response with overshoot
        g.strokeStyle = "#222"; g.lineWidth = 3; g.beginPath(); g.moveTo(80, 600); g.lineTo(80, 400); g.moveTo(80, 600); g.lineTo(560, 600); g.stroke();
        g.setLineDash([10, 8]); g.beginPath(); g.moveTo(80, 470); g.lineTo(560, 470); g.stroke(); g.setLineDash([]);
        g.strokeStyle = "#b8231c"; g.lineWidth = 4; g.beginPath();
        for (let t = 0; t <= 1; t += 0.01) { const y = 1 - Math.exp(-5 * t) * Math.cos(14 * t); g.lineTo(80 + t * 480, 600 - y * 130); }
        g.stroke();
        g.fillStyle = "#b8231c"; g.font = hand(34); g.fillText("overshoot :(", 200, 420);
        g.fillStyle = "#222"; g.font = hand(38);
        g.fillText("u = Kp·e + Ki∫e dt + Kd·de/dt", 600, 450);
        g.fillText("TODO: less Kd noise →", 600, 540); g.fillText("filter the D term", 640, 590);
      },
      (g) => { // Kalman filter
        g.fillStyle = "#1d2f6f"; g.textAlign = "left"; g.font = hand(48); g.fillText("Kalman filter", 50, 80);
        g.strokeStyle = "#1d2f6f"; g.lineWidth = 3; g.beginPath(); g.moveTo(50, 92); g.lineTo(330, 96); g.stroke();
        g.font = hand(40); g.fillStyle = "#222";
        g.fillText("predict", 60, 170);
        g.fillText("x̂⁻ = A x̂ + B u", 100, 225); g.fillText("P⁻ = A P Aᵀ + Q", 100, 280);
        g.fillText("update", 60, 370);
        g.fillText("K = P⁻Hᵀ (H P⁻Hᵀ + R)⁻¹", 100, 425);
        g.fillText("x̂ = x̂⁻ + K (z − H x̂⁻)", 100, 480);
        g.fillText("P = (I − K H) P⁻", 100, 535);
        g.fillStyle = "#b8231c"; g.font = hand(38); g.fillText("Q too small → trusts", 640, 300); g.fillText("the model, ignores IMU", 640, 345);
        g.strokeStyle = "#b8231c"; g.lineWidth = 3; g.beginPath(); g.ellipse(250, 280, 170, 36, 0, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(420, 285); g.lineTo(630, 300); g.stroke();
      },
      (g) => { // quadrotor free-body sketch
        g.strokeStyle = "#222"; g.lineWidth = 5; const cx = 300, cy = 330;
        g.beginPath(); g.moveTo(cx - 170, cy); g.lineTo(cx + 170, cy); g.stroke();
        [-170, 170].forEach((dx) => { g.beginPath(); g.ellipse(cx + dx, cy - 12, 70, 12, 0, 0, 7); g.stroke(); });
        g.fillStyle = "#222"; g.fillRect(cx - 30, cy - 18, 60, 36);
        const up = (x, txt) => { g.strokeStyle = "#1d2f6f"; g.fillStyle = "#1d2f6f"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, cy - 30); g.lineTo(x, cy - 160); g.stroke(); g.beginPath(); g.moveTo(x, cy - 175); g.lineTo(x - 12, cy - 150); g.lineTo(x + 12, cy - 150); g.fill(); g.font = hand(38); g.fillText(txt, x + 14, cy - 140); };
        up(cx - 170, "F₁"); up(cx + 170, "F₂");
        g.strokeStyle = "#b8231c"; g.fillStyle = "#b8231c"; g.beginPath(); g.moveTo(cx, cy + 20); g.lineTo(cx, cy + 170); g.stroke(); g.beginPath(); g.moveTo(cx, cy + 185); g.lineTo(cx - 12, cy + 160); g.lineTo(cx + 12, cy + 160); g.fill(); g.font = hand(38); g.fillText("mg", cx + 14, cy + 160);
        g.fillStyle = "#222"; g.font = hand(42); g.textAlign = "left";
        g.fillText("m z̈ = ΣFᵢ − mg", 590, 220);
        g.fillText("τ = I ω̇ + ω × (I ω)", 590, 300);
        g.fillText("τ_φ = l (F₂ − F₁)", 590, 380);
        g.fillStyle = "#1d2f6f"; g.font = hand(36); g.fillText("hover: ΣFᵢ = mg", 590, 480);
      },
    ];
    const wbTex = tex(1000, 700, () => {});
    let wbI = Math.floor(Math.random() * BOARDS.length);
    function paintWB() {
      redraw(wbTex, (g, w, h) => {
        g.fillStyle = "#f6f7f5"; g.fillRect(0, 0, w, h);
        const r = seeded(wbI + 5);
        for (let i = 0; i < 9; i++) { // ghosts of old, badly erased boards
          g.fillStyle = `rgba(90,100,120,${0.03 + r() * 0.04})`;
          g.beginPath(); g.ellipse(r() * w, r() * h, 60 + r() * 160, 14 + r() * 30, r() * 0.4 - 0.2, 0, 7); g.fill();
        }
        g.save(); BOARDS[wbI](g, w, h); g.restore();
      });
    }
    const wbGrp = put(new T.Group(), RR - 6, (WB.y0 + WB.y1) / 2, WB.z0, tall);
    wbGrp.rotation.z = -Math.PI / 2; // face into the room
    {
      const W = WB.y1 - WB.y0, H = WB.z1 - WB.z0;
      const face = front(W, H, std(0xffffff, 0.25, 0, { map: wbTex })); face.position.set(0, -14, H / 2); face.receiveShadow = true; wbGrp.add(face);
      const alu = std(0xc9ccd0, 0.35, 0.8);
      [[0, H + 6, W + 24, 16], [0, -6, W + 24, 16]].forEach(([x, z, ww, hh]) => { const b = box(ww, 22, hh, alu); b.position.set(x, -6, z - hh / 2); wbGrp.add(b); });
      [-W / 2 - 6, W / 2 + 6].forEach((x) => { const b = box(16, 22, H + 24, alu); b.position.set(x, -6, -12); wbGrp.add(b); });
      const tray = box(W * 0.6, 50, 14, alu); tray.position.set(0, -32, -40); wbGrp.add(tray);
      [0x1d2f6f, 0xb8231c, 0x222222].forEach((c, i) => {
        const mk = shadow(new T.Mesh(new T.CylinderGeometry(9, 9, 130, 12), std(c, 0.5))); mk.rotation.z = Math.PI / 2; mk.position.set(-160 + i * 150, -34, -18); wbGrp.add(mk);
      });
      const eraser = box(110, 40, 30, std(0x333333, 0.8)); eraser.position.set(200, -34, -26); wbGrp.add(eraser);
    }
    hot(wbGrp, "whiteboard · click to wipe it and start another", () => { fx("zip"); wbI = (wbI + 1) % BOARDS.length; paintWB(); });
    paintWB();

    // a cart against the wall with an enclosed CoreXY printer and a 4-spool feeder on top: click to print a gear
    const CART_AT = { x: 3900, y: 430, top: -40, w: 860, d: 840 }; // desk height, back edge touching the wall
    const cart = put(new T.Group(), CART_AT.x, CART_AT.y, FLOOR, tall);
    {
      const frameM = std(0x2f3133, 0.5, 0.5), shelfM = std(0x8a6a45, 0.7);
      const lx = CART_AT.w / 2 - 30, ly = CART_AT.d / 2 - 30;
      const corners = [[-lx, -ly], [lx, -ly], [-lx, ly], [lx, ly]];
      corners.forEach(([x, y]) => { const p = box(30, 30, CART_AT.top - FLOOR, frameM); p.position.set(x, y, 40); cart.add(p); });
      [40 + 120, CART_AT.top - FLOOR - 10].forEach((z) => { const s = rbox(CART_AT.w, CART_AT.d, 26, 6, shelfM); s.position.z = z; cart.add(s); });
      corners.forEach(([x, y]) => { const w = new T.Mesh(new T.SphereGeometry(22, 12, 8), std(0x111111, 0.6)); w.position.set(x, y, 22); cart.add(shadow(w)); });
      const s = new T.Mesh(new T.CylinderGeometry(120, 120, 70, 28), std(0xe8a33d, 0.55)); s.position.set(270, 0, 220); cart.add(shadow(s)); // a spare spool
    }
    const PW_ = 780, PD = 780, PHt = 916; // ~389 x 389 x 458 mm
    const printer = put(new T.Group(), CART_AT.x, CART_AT.y, CART_AT.top + 16, tall);
    const pBlack = std(0x18191b, 0.55, 0.2), pRail = std(0xb7bbc0, 0.35, 0.8);
    const glassM = (op) => new T.MeshStandardMaterial({ color: 0x1d2228, roughness: 0.08, metalness: 0.1, transparent: true, opacity: op, depthWrite: false });
    const noShadow = (m) => { m.castShadow = false; m.receiveShadow = false; return m; };
    {
      const fy = -PD / 2; // front face (local -y is towards the room)
      printer.add(box(PW_, PD, 120, pBlack));                                   // base
      const top = box(PW_, PD, 110, pBlack); top.position.z = PHt - 110; printer.add(top);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => { const p = box(40, 40, PHt - 230, pBlack); p.position.set(sx * (PW_ / 2 - 20), sy * (PD / 2 - 20), 120); printer.add(p); });
      const back = box(PW_ - 80, 10, PHt - 230, pBlack); back.position.set(0, PD / 2 - 5, 120); printer.add(back);
      [-1, 1].forEach((sx) => { const g = noShadow(new T.Mesh(new T.BoxGeometry(8, PD - 80, PHt - 230), glassM(0.45))); g.position.set(sx * (PW_ / 2 - 4), 0, 120 + (PHt - 230) / 2); printer.add(g); });
      const door = noShadow(new T.Mesh(new T.BoxGeometry(PW_ - 80, 8, PHt - 236), glassM(0.22))); door.position.set(0, fy - 4, 120 + (PHt - 230) / 2); printer.add(door);
      const handle = box(18, 26, 300, pRail); handle.position.set(PW_ / 2 - 70, fy - 20, 300); printer.add(handle);
      // screen on the top front bar, a light strip under it
      const scr = new T.Mesh(new T.PlaneGeometry(150, 80), new T.MeshBasicMaterial({ color: 0x0d1a26, toneMapped: false }));
      scr.rotation.x = Math.PI / 2; scr.position.set(-PW_ / 2 + 130, fy - 1, PHt - 55); printer.add(scr);
      printer.userData.screen = scr;
      const strip = new T.Mesh(new T.BoxGeometry(PW_ - 120, 10, 6), new T.MeshBasicMaterial({ color: 0xfff3dc, toneMapped: false }));
      strip.position.set(0, fy + 40, PHt - 118); printer.add(strip);
      const lamp = new T.PointLight(0xfff2dd, 1.4, 900, 0); lamp.position.set(0, -60, PHt - 160); printer.add(lamp);
      printer.userData.lamp = lamp;
      // CoreXY rails along the top inside
      [-1, 1].forEach((sx) => { const r = box(24, PD - 100, 24, pRail); r.position.set(sx * (PW_ / 2 - 60), 0, PHt - 170); printer.add(r); });
    }
    const xBar = box(PW_ - 120, 30, 30, pRail); printer.add(xBar);
    const head = new T.Group(); printer.add(head);
    head.add(rbox(110, 120, 150, 10, std(0x2a2c2f, 0.5)));
    { const c = rbox(100, 6, 120, 6, std(0x3a3d41, 0.4)); c.position.set(0, -62, 15); head.add(c); }
    const nozzle = new T.Mesh(new T.ConeGeometry(9, 24, 10), std(0xc9a14a, 0.3, 0.9)); nozzle.rotation.x = -Math.PI / 2; nozzle.position.z = -10; head.add(nozzle);
    const NZ = PHt - 170 - 160; // nozzle tip height inside the chamber
    const bed = new T.Group(); printer.add(bed);
    bed.add(box(540, 540, 14, std(0x2b2d30, 0.6, 0.2)));
    { const sheet = box(520, 520, 2, std(0x3d3f44, 0.85)); sheet.position.z = 14; bed.add(sheet); }
    const gearShape = (() => {
      const s = new T.Shape(), N = 12, R = 95, r = 76;
      for (let i = 0; i <= N * 4; i++) {
        const a = i / (N * 4) * Math.PI * 2, rr = (i % 4 < 2) ? R : r;
        i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      const hole = new T.Path(); hole.absarc(0, 0, 24, 0, Math.PI * 2, true); s.holes.push(hole);
      return s;
    })();
    renderer.localClippingEnabled = true;
    const printClip = new T.Plane(new T.Vector3(0, 0, -1), 0);
    const GEAR_H = 60, BED_TOP = 16;
    const gearMat = std(0xff7a1a, 0.55, 0, { clippingPlanes: [printClip] });
    const gear = shadow(new T.Mesh(new T.ExtrudeGeometry(gearShape, { depth: GEAR_H, bevelEnabled: false }), gearMat));
    gear.position.z = BED_TOP; bed.add(gear);
    // the 4-spool feeder on the lid: a dark body, a smoked cover, four spools seen through it
    const AW = 720, AD = 570, AH = 456;
    // filament: what's left on each spool (grams), which one feeds the printer; remembered in this browser
    const FIL = [
      { name: "orange PLA", c: 0xff7a1a, g: 640 }, { name: "white PLA", c: 0xf2f2ee, g: 860 },
      { name: "black PETG", c: 0x1b1b1b, g: 310 }, { name: "blue PLA", c: 0x2f6fd0, g: 70 },
    ];
    let filSel = 0, failCount = 0, printCount = 0;
    try {
      const st = JSON.parse(localStorage.getItem("nb-printer") || "null");
      if (st) { st.g.forEach((g, i) => FIL[i] && (FIL[i].g = g)); filSel = st.sel || 0; failCount = st.fails || 0; printCount = st.prints || 0; }
    } catch (_) {}
    const saveFil = () => { try { localStorage.setItem("nb-printer", JSON.stringify({ g: FIL.map((f) => f.g), sel: filSel, fails: failCount, prints: printCount })); } catch (_) {} };
    const GRAMS = 18; // one gear
    const ams = new T.Group(); ams.position.set(0, 60, PHt); printer.add(ams);
    {
      ams.add(rbox(AW, AD, 170, 12, std(0x3a3d42, 0.55, 0.1)));
      const lid = noShadow(new T.Mesh(rboxGeo(AW - 10, AD - 10, AH - 170, 30), glassM(0.5))); lid.position.z = 170; ams.add(lid);
      ams.userData.lid = lid;
      FIL.forEach((f, i) => {
        const x = -AW / 2 + 110 + i * 166, g = new T.Group(); g.position.set(x, -20, 190); ams.add(g);
        const core = new T.Mesh(new T.CylinderGeometry(58, 58, 112, 20), std(0xb59a72, 0.9)); core.rotation.z = Math.PI / 2; g.add(core);
        f.mesh = new T.Mesh(new T.CylinderGeometry(1, 1, 108, 32), std(f.c, 0.5)); f.mesh.rotation.z = Math.PI / 2; g.add(shadow(f.mesh, true, false));
        [-58, 58].forEach((o) => { const fl = new T.Mesh(new T.CylinderGeometry(172, 172, 6, 32), std(0xd8d8d8, 0.4, 0, { transparent: true, opacity: 0.55 })); fl.rotation.z = Math.PI / 2; fl.position.x = o; g.add(fl); });
        f.led = new T.Mesh(new T.PlaneGeometry(40, 10), new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })); f.led.rotation.x = Math.PI / 2; f.led.position.set(x, -AD / 2 - 1, 120); ams.add(f.led);
        f.grp = g;
      });
      // the feed tube down the back into the printer
      const tubeM = std(0xeeeeee, 0.3, 0, { transparent: true, opacity: 0.8 });
      ams.add(noShadow(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
        new T.Vector3(0, AD / 2 - 40, 120), new T.Vector3(40, AD / 2 + 90, 60), new T.Vector3(80, AD / 2 + 60, -80), new T.Vector3(60, AD / 2 - 20, -60),
      ]), 20, 8, 6), tubeM)));
    }
    let printT = 1, printing = false, job = null;
    const _v = new T.Vector3();
    const spoolTip = (i) => { const f = FIL[i]; return `spool · ${f.name} · ${Math.round(f.g)} g left${f.g < 1 ? " · empty" : i === filSel ? " · loaded" : " · click to load"}`; };
    function paintSpools() {
      FIL.forEach((f, i) => {
        const r = Math.sqrt(58 * 58 + (160 * 160 - 58 * 58) * Math.max(0, Math.min(1, f.g / 1000)));
        f.mesh.scale.set(r, 1, r); f.mesh.visible = f.g >= 1;
        f.led.material.color.set(f.g < 1 ? 0xff3b30 : i === filSel ? 0x3fdc6a : 0x8a8a8a);
        retip(f.grp, spoolTip(i));
      });
      gearMat.color.set(FIL[filSel].c);
      dirty = true;
    }
    // a failed print: a tangle of filament that grows where the part should be
    function tangle(color, seed) {
      const r = seeded(seed), pts = [];
      let x = 0, y = 0, z = 6;
      for (let i = 0; i < 46; i++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 70; x *= 0.92; y *= 0.92; z = 4 + r() * 46; pts.push(new T.Vector3(x, y, z)); }
      const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 300, 3.2, 5), std(color, 0.6));
      return shadow(m, true, false);
    }
    let spaghetti = null;
    const setPrint = (f, now = 0) => {
      const shown = job && job.fail ? Math.min(f, job.failAt) : f;
      // the bed rises to the nozzle and drops one layer at a time; idle, it rests lower down
      const bedZ = printing ? NZ - BED_TOP - GEAR_H * shown - 4 : NZ - BED_TOP - GEAR_H - 220;
      bed.position.set(0, 0, bedZ);
      const hx = printing ? Math.sin(now / 110) * 90 : 160, hy = printing ? Math.cos(now / 170) * 80 : 160;
      head.position.set(hx, hy, NZ + 10);
      xBar.position.set(0, hy, PHt - 175);
      printer.updateMatrixWorld(true);
      printClip.constant = bed.localToWorld(_v.set(0, 0, BED_TOP + GEAR_H * shown)).z;
      gear.visible = shown > 0.001;
    };
    setPrint(1);
    const screenSet = (c) => { printer.userData.screen.material.color.set(c); };
    function stepCorner(dt, now) {
      if (!printing) return;
      printT = Math.min(1, printT + dt / 10);
      setPrint(printT, now);
      const f = FIL[filSel];
      if (job.fail && printT > job.failAt) {
        // the part let go of the bed: knocked over, and the nozzle keeps pushing plastic into the air
        if (!spaghetti) {
          spaghetti = tangle(f.c, job.seed); spaghetti.position.z = BED_TOP; bed.add(spaghetti);
          gear.rotation.set(0.35, 0.2, 0); gear.position.set(60, -30, BED_TOP + 10);
          retip(printer, "3D printer · uh oh. spaghetti");
          fx("hiss");
        }
        const total = spaghetti.geometry.index.count, frac = (printT - job.failAt) / (1 - job.failAt);
        spaghetti.geometry.setDrawRange(0, Math.floor(total * frac / 30) * 30);
        screenSet(Math.floor(now / 300) % 2 ? 0x5a0f0f : 0xc0392b);
      } else printer.userData.screen.material.color.setHSL(0.55, 0.6, 0.25 + 0.1 * Math.sin(now / 250));
      if (printT >= 1) finishJob();
    }
    function finishJob() {
      printing = false;
      const f = FIL[filSel], used = job.fail ? GRAMS * job.failAt : GRAMS;
      f.g = Math.max(0, f.g - used); printCount++;
      setPrint(1);
      if (!job.fail) {
        screenSet(0x0d1a26); fx("beep");
        retip(printer, `3D printer · done. ${GRAMS} g of ${f.name} · click to print another`);
      } else {
        // into the bin it goes
        failCount++;
        screenSet(0x5a0f0f);
        retip(printer, `3D printer · failed. it's in the bin now (${failCount} so far)`);
        const fail = job;
        setTimeout(() => {
          if (spaghetti) { bed.remove(spaghetti); spaghetti.geometry.dispose(); spaghetti = null; }
          gear.visible = false; gear.rotation.set(0, 0, 0); gear.position.set(0, 0, BED_TOP);
          addJunk(f.c, fail.seed); binShake = 1; fx("zip"); retipBin(); screenSet(0x0d1a26);
          dirty = true;
        }, 1200);
      }
      job = null;
      saveFil(); paintSpools();
    }
    hot(printer, "3D printer · click to print a gear", () => {
      if (printing) return;
      const f = FIL[filSel];
      if (f.g < GRAMS) { fx("beep"); retip(printer, `3D printer · not enough ${f.name} (${Math.round(f.g)} g). load another spool`); return; }
      // the first print always works; after that about one in four lets go of the bed
      const fail = printCount > 0 && Math.random() < 0.25;
      job = { fail, failAt: 0.3 + Math.random() * 0.35, seed: (Math.random() * 1e9) | 0 };
      gear.rotation.set(0, 0, 0); gear.position.set(0, 0, BED_TOP);
      printT = 0; printing = true; fx("whir");
      retip(printer, `3D printer · printing a gear in ${f.name}…`);
    });
    // the smoked lid shouldn't swallow clicks meant for the spools under it
    { const i = hits.indexOf(ams.userData.lid); if (i >= 0) hits.splice(i, 1); }
    FIL.forEach((f, i) => hot(f.grp, spoolTip(i), () => {
      if (printing) { fx("beep"); return; }
      if (f.g < 1) { fx("beep"); return; }
      filSel = i; fx("click"); saveFil(); paintSpools();
    }, { find: "filament spools" }));
    paintSpools();

    // the bin of everything that broke
    let binShake = 0;
    const bin = put(new T.Group(), CART_AT.x - 130, CART_AT.y, FLOOR + 186, tall); // on the cart's lower shelf, under the printer
    {
      const crate = std(0x3b4a5c, 0.7);
      const B = { w: 420, d: 320, h: 330 };
      [[0, -B.d / 2, B.w, 16], [0, B.d / 2, B.w, 16]].forEach(([x, y, w, d]) => { const s = box(w, d, B.h, crate); s.position.set(x, -y, 0); bin.add(s); });
      [[-B.w / 2, 0], [B.w / 2, 0]].forEach(([x]) => { const s = box(16, B.d, B.h, crate); s.position.set(x, 0, 0); bin.add(s); });
      bin.add(box(B.w, B.d, 14, crate));
      const r = seeded(42), junk = [
        () => box(160, 110, 8, std(0x2f7a3a, 0.6)),                                   // a dead board
        () => box(80, 40, 72, std(0x1f4ea8, 0.5)),                                    // servo
        () => box(90, 40, 72, std(0x111111, 0.5)),                                    // another servo
        () => shadow(new T.Mesh(new T.TorusGeometry(40, 8, 8, 20, Math.PI * 1.3), std(0xff7a1a, 0.6))), // a snapped print
        () => box(140, 22, 22, std(0xff7a1a, 0.6)),                                   // a failed bracket
        () => shadow(new T.Mesh(new T.CylinderGeometry(22, 22, 70, 14), std(0x9aa0a6, 0.4, 0.8))), // motor
        () => box(120, 120, 6, std(0x6b8f2a, 0.6)),
      ];
      junk.forEach((mk, i) => {
        const m = mk(); m.position.set((r() - 0.5) * 260, (r() - 0.5) * 180, B.h - 70 + r() * 70);
        m.rotation.set((r() - 0.5) * 1.2, (r() - 0.5) * 1.2, r() * 3); bin.add(m);
      });
      // a burnt mark on the dead board, wires hanging over the edge
      const wireM = [std(0xd23b2b, 0.6), std(0x222222, 0.6), std(0xe8c21b, 0.6)];
      wireM.forEach((m, i) => bin.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([
        new T.Vector3(-60 + i * 50, -40, B.h - 20), new T.Vector3(-40 + i * 50, -B.d / 2 - 10, B.h + 30), new T.Vector3(-30 + i * 50, -B.d / 2 - 20, B.h - 120),
      ]), 16, 4, 6), m)));
      const label = front(220, 70, std(0xffffff, 0.9, 0, { map: tex(440, 140, (g, w, h) => {
        g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, w, h); g.fillStyle = "#b8231c"; g.font = hand(64); g.textAlign = "center"; g.fillText("broke :(", w / 2, 92);
      }) }));
      label.position.set(0, -B.d / 2 - 10, B.h * 0.55); bin.add(label);
    }
    const binTip = () => `the bin of everything that broke · ${failCount ? failCount + " failed print" + (failCount > 1 ? "s" : "") + " so far" : "nothing from the printer yet"} · click to rummage`;
    hot(bin, binTip(), () => { binShake = 1; fx("zip"); });
    const retipBin = () => retip(bin, binTip());
    function addJunk(color, seed) {
      // a balled-up failed print lands on top of the pile
      const r = seeded(seed + 1), t = tangle(color, seed);
      t.scale.setScalar(0.9); t.position.set((r() - 0.5) * 200, (r() - 0.5) * 140, 260 + Math.min(bin.userData.extra, 8) * 10);
      t.rotation.set(r() * 3, r() * 3, r() * 3);
      bin.add(t); bin.userData.extra++;
      t.traverse((m) => { if (m.isMesh) { m.userData.tip = binTip(); m.userData.click = bin.children[0].userData.click; hits.push(m); } });
    }
    bin.userData.extra = 0;
    for (let i = 0; i < Math.min(failCount, 8); i++) addJunk(FIL[i % 4].c, 1000 + i);
    const stepBin = (dt) => {
      if (binShake <= 0) return;
      binShake = Math.max(0, binShake - dt * 1.6);
      bin.rotation.z = Math.sin(binShake * 40) * 0.05 * binShake;
    };

    // a small monstera in the corner by the window: split, holed leaves on arching stems
    const plant = put(new T.Group(), 4640, 760, FLOOR, tall); // right corner, clear of the cart
    {
      const POT = 300;
      plant.add(lathe([[0, 0], [110, 0], [140, POT - 20], [148, POT], [0, POT]], std(0xd9d2c4, 0.6)));
      const soil = new T.Mesh(new T.CircleGeometry(136, 24), std(0x3a2a1c, 1)); soil.position.z = POT - 12; plant.add(soil);
      const leafTex = tex(512, 512, (g, w, h) => {
        // ovate, heart-notched blade; midrib along x = w/2, stem joins at the bottom
        g.clearRect(0, 0, w, h);
        const cx = w / 2, base = h * 0.9;
        g.fillStyle = "#1a5523";
        g.beginPath();
        g.moveTo(cx, base - 26);                                        // the notch
        g.bezierCurveTo(cx - 40, base + 10, cx - w * 0.5, base - 30, cx - w * 0.47, h * 0.45);
        g.bezierCurveTo(cx - w * 0.44, h * 0.16, cx - w * 0.16, h * 0.03, cx, h * 0.02);
        g.bezierCurveTo(cx + w * 0.16, h * 0.03, cx + w * 0.44, h * 0.16, cx + w * 0.47, h * 0.45);
        g.bezierCurveTo(cx + w * 0.5, base - 30, cx + 40, base + 10, cx, base - 26);
        g.fill();
        const grd = g.createRadialGradient(cx, h * 0.55, 20, cx, h * 0.5, w * 0.55);
        grd.addColorStop(0, "rgba(255,255,220,.12)"); grd.addColorStop(1, "rgba(0,30,0,.25)");
        g.globalCompositeOperation = "source-atop"; g.fillStyle = grd; g.fillRect(0, 0, w, h);
        // splits: curved slots that follow the side veins, wide at the edge, closing near the midrib
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = "#000"; // cut all the way through
        const r = seeded(77);
        for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {
          const y0 = h * (0.2 + i * 0.13) + (r() - 0.5) * 8;       // where it starts near the rib
          const x0 = cx + sd * w * 0.09;
          const x1 = cx + sd * w * 0.56, y1 = y0 - h * 0.13;         // out past the edge, angled forward
          const wid = 22 + i * 4;
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo(cx + sd * w * 0.32, y0 - h * 0.02, x1, y1 - wid);
          g.lineTo(x1, y1 + wid);
          g.quadraticCurveTo(cx + sd * w * 0.32, y0 + h * 0.012, x0, y0 + 3);
          g.fill();
          if (i > 0 && i < 4) { g.beginPath(); g.ellipse(cx + sd * w * 0.15, y0 + h * 0.06, 14, 30, sd * 0.5, 0, 7); g.fill(); } // holes by the rib
        }
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = "#8fbf6a"; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, base - 26); g.quadraticCurveTo(cx + 4, h * 0.5, cx, h * 0.05); g.stroke();
      });
      const leafM = std(0xffffff, 0.6, 0, { map: leafTex, alphaTest: 0.5, side: T.DoubleSide, envMapIntensity: 0.25 });
      const stem = std(0x5a8a40, 0.7);
      const r = seeded(9);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (1.02 + i / 6 * 0.78) + (r() - 0.5) * 0.2, h = 420 + r() * 380, lean = 120 + r() * 140; // fanned towards the room: clear of the cart and the right wall
        const tip = new T.Vector3(Math.cos(a) * lean, Math.sin(a) * lean, POT + h);
        plant.add(shadow(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 0, POT - 10), new T.Vector3(tip.x * 0.25, tip.y * 0.25, POT + h * 0.7), tip]), 10, 6, 6), stem)));
        // the blade grows out from the stem tip along the stem's direction, face up, drooping at the end
        const S = 360 + r() * 140, lg = new T.PlaneGeometry(S, S, 8, 8), p = lg.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const x = p.getX(k), y = p.getY(k) + S * 0.42;              // base of the leaf near the origin
          p.setY(k, y); p.setZ(k, -Math.pow(Math.max(0, y) / S, 2) * S * 0.45 + (Math.abs(x) / S) * S * 0.1);
        }
        lg.computeVertexNormals();
        const leaf = shadow(new T.Mesh(lg, leafM), true, true);
        leaf.position.copy(tip);
        leaf.rotation.order = "ZXY";
        leaf.rotation.set(0.25 + r() * 0.3, 0, a - Math.PI / 2);
        plant.add(leaf);
      }
    }
    hot(plant, "monstera · still alive, somehow");
    const shelfMetal = std(0xdedcd5, 0.55, 0.15);
    [60, 1700, 3340].forEach((x) => put(box(40, 40, 2200, shelfMetal), x, 340, -70, tall));
    [1100, 1560].forEach((z) => put(rbox(3400, 380, 44, 4, std(0xeceae4, 0.6)), 1700, 170, z, tall));
    // lower shelf: toolbox, the yellow cable coil, the multimeter's box, parts tubs
    put(rbox(380, 220, 140, 10, std(0xc0392b, 0.45, 0.2)), 330, 180, 1144, tall);
    tall.add(rod([250, 180, 1300], [410, 180, 1300], 10, std(0x222222, 0.4, 0.6)));
    const coilMat = std(0xe7c11b, 0.45);
    for (let i = 0; i < 6; i++) put(shadow(new T.Mesh(new T.TorusGeometry(130 - (i % 2) * 6, 12, 10, 48), coilMat)), 800 + (i % 3) * 4, 180, 1158 + i * 18, tall);
    const boxTex = tex(512, 160, (g, w, h) => {
      g.fillStyle = "#f6f6f4"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#333"; g.font = "800 44px system-ui, sans-serif"; g.fillText("DIGITAL MULTIMETER", 18, 96);
      g.fillStyle = "#c0392b"; g.fillRect(0, h - 18, w, 18);
    });
    const white = std(0xf6f6f4, 0.7);
    put(box(440, 260, 120, [white, white, white, std(0xffffff, 0.6, 0, { map: boxTex }), white, white]), 1240, 190, 1144, tall).rotation.z = 0.04;
    put(box(200, 200, 160, std(0xc84a3a, 0.8)), 1950, 170, 1144, tall);
    put(rbox(200, 160, 100, 12, std(0xf0e6c8, 0.5)), 2900, 170, 1144, tall);
    put(rbox(160, 140, 80, 12, std(0xcfe0ea, 0.3)), 3110, 170, 1144, tall);
    // top shelf
    put(box(380, 260, 200, std(0xc9a36b, 0.9)), 360, 170, 1604, tall);
    put(box(300, 240, 150, std(0xd6b37a, 0.9)), 2520, 170, 1604, tall).rotation.z = -0.05;
    put(box(520, 300, 60, std(0xf3f1ea, 0.8)), 1250, 180, 1604, tall);
    // robotics + controls books: upright on both shelves, a flat stack up top
    const pageMat = std(0xcfc4a8, 0.95);
    const shelfBooks = [];
    function spine(g, L, Th, b) {
      const light = (b.c & 0xff) + ((b.c >> 8) & 0xff) + ((b.c >> 16) & 0xff) > 520;
      const ink = light ? "#1d1d1d" : "#f3eee0";
      g.fillStyle = "#" + b.c.toString(16).padStart(6, "0"); g.fillRect(0, 0, L, Th);
      const sh = g.createLinearGradient(0, 0, 0, Th); // the spine is round, so it shades
      sh.addColorStop(0, "rgba(0,0,0,.28)"); sh.addColorStop(0.35, "rgba(255,255,255,.08)"); sh.addColorStop(1, "rgba(0,0,0,.32)");
      g.fillStyle = sh; g.fillRect(0, 0, L, Th);
      g.fillStyle = ink; g.globalAlpha = 0.75;
      g.fillRect(L * 0.04, 0, 3, Th); g.fillRect(L * 0.96 - 3, 0, 3, Th);
      g.globalAlpha = 1; g.textBaseline = "middle";
      const fit = (txt, font, px, max) => { g.font = `${font} ${px}px Georgia, "Times New Roman", serif`; const w = g.measureText(txt).width; if (w > max) { px *= max / w; g.font = `${font} ${px}px Georgia, "Times New Roman", serif`; } };
      fit(b.t, "700", Th * 0.42, L * 0.62); g.fillText(b.t, L * 0.08, Th / 2);
      fit(b.a, "italic 400", Th * 0.3, L * 0.22); g.textAlign = "right"; g.fillText(b.a, L * 0.92, Th / 2); g.textAlign = "left";
    }
    const K = 3;
    function upright(b, x, z, lean = 0) {
      const t = tex(Math.round(b.w * K), Math.round(b.h * K), (g, w, h) => { g.save(); g.translate(w, 0); g.rotate(Math.PI / 2); spine(g, h, w, b); g.restore(); });
      const cover = std(b.c, 0.7);
      const m = box(b.w, 200, b.h, [cover, cover, pageMat, std(0xffffff, 0.6, 0, { map: t }), pageMat, pageMat]);
      const grp = new T.Group(); grp.add(m);
      grp.rotation.y = lean;
      put(grp, x, 175, z, tall);
      grp.userData.home = grp.position.y; grp.userData.pull = 46;
      shelfBooks.push(grp);
      hot(grp, `<b>${b.t}</b> · ${b.a}`, null, { drawer: grp });
      return grp;
    }
    function row(list, x, z, gap = 2) {
      let right = x;
      list.forEach((b, i) => { upright(b, right + b.w / 2, z); right += b.w + gap + (i % 4 === 2 ? 6 : 0); });
      return right;
    }
    // lower shelf, between the parts tub and the jars
    const lowerRow = [
      { t: "Modern Robotics", a: "Lynch · Park", c: 0x1f3a5f, w: 48, h: 255 },
      { t: "Probabilistic Robotics", a: "Thrun · Burgard · Fox", c: 0x8b1e1e, w: 62, h: 235 },
      { t: "Robotics: Modelling, Planning and Control", a: "Siciliano et al.", c: 0x2e5e4e, w: 58, h: 240 },
      { t: "Introduction to Robotics", a: "Craig", c: 0xdcd6c4, w: 44, h: 245 },
      { t: "Robot Modeling and Control", a: "Spong · Hutchinson · Vidyasagar", c: 0x3a3a3a, w: 50, h: 250 },
      { t: "Feedback Systems", a: "Åström · Murray", c: 0xc9772b, w: 40, h: 232 },
      { t: "Modern Control Engineering", a: "Ogata", c: 0x24527a, w: 70, h: 262 },
      { t: "Feedback Control of Dynamic Systems", a: "Franklin · Powell · Emami-Naeini", c: 0x6b2d5c, w: 66, h: 270 },
      { t: "Nonlinear Systems", a: "Khalil", c: 0x1d1d1d, w: 52, h: 240 },
      { t: "The Art of Electronics", a: "Horowitz · Hill", c: 0x8c1c13, w: 80, h: 285 },
    ];
    const lowEnd = row(lowerRow, 2075, 1144);
    { // the last one leans on the others
      const b = { t: "Planning Algorithms", a: "LaValle", c: 0xe2c25a, w: 46, h: 250 }, a = -0.28;
      upright(b, lowEnd + (b.w / 2) * Math.cos(a) + b.h * Math.sin(-a) - 4, 1144 + (b.w / 2) * Math.sin(-a), a);
    }
    // top shelf: a few paperbacks and a bookend
    const topEnd = row([
      { t: "Applied Nonlinear Control", a: "Slotine · Li", c: 0x15385e, w: 34, h: 210 },
      { t: "Control System Design", a: "Goodwin et al.", c: 0x4a6a2a, w: 46, h: 215 },
      { t: "Linear System Theory and Design", a: "Chen", c: 0x5b1a2e, w: 42, h: 212 },
      { t: "Autonomous Mobile Robots", a: "Siegwart · Nourbakhsh", c: 0x2f6f73, w: 40, h: 214 },
      { t: "Mechanics of Robotic Manipulation", a: "Mason", c: 0xe9e4d6, w: 30, h: 205 },
    ], 2720, 1604);
    const bookend = std(0x2a2a2a, 0.45, 0.5);
    put(box(8, 160, 170, bookend), topEnd + 4, 175, 1604, tall);
    put(box(90, 160, 6, bookend), topEnd + 49, 175, 1604, tall);
    // and a stack lying flat, spines out
    [
      { t: "Dynamic Programming and Optimal Control", a: "Bertsekas", c: 0x274b3a, w: 290, h: 50, r: 0.02 },
      { t: "Multiple View Geometry", a: "Hartley · Zisserman", c: 0xdedbd0, w: 280, h: 56, r: -0.04 },
      { t: "State Estimation for Robotics", a: "Barfoot", c: 0x2f4f8f, w: 262, h: 34, r: 0.05 },
      { t: "Small Unmanned Aircraft", a: "Beard · McLain", c: 0x9a3b1b, w: 250, h: 36, r: -0.02 },
    ].reduce((z, b) => {
      const t = tex(Math.round(b.w * K), Math.round(b.h * K), (g, w, h) => spine(g, w, h, b));
      const cover = std(b.c, 0.7);
      const m = box(b.w, 210, b.h, [pageMat, pageMat, pageMat, std(0xffffff, 0.6, 0, { map: t }), cover, cover]);
      m.rotation.z = b.r;
      put(m, 1930, 175, z, tall);
      hot(m, `<b>${b.t}</b> · ${b.a}`);
      return z + b.h;
    }, 1604);
    /* ---------- a speaker on the lower shelf, a stack of movie CDs on the top shelf ---------- */
    // titles and the song come from img/shelf/media.json (see img/shelf/README.md)
    const media = { song: null, movies: [] };
    const SPK = { x: 1568, y: 190, z: 1144 };
    const speaker = put(new T.Group(), SPK.x, SPK.y, SPK.z, tall);
    // a small round smart speaker: matte black, perforated all round, a slider groove on the flat top
    {
      const R = 108, H = 330, body = new T.Group(); speaker.add(body); speaker.userData.body = body;
      const grille = tex(1024, 256, (g, w, h) => {
        g.fillStyle = "#151516"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#050505";
        for (let y = 4; y < h; y += 7) for (let x = (y / 7) % 2 ? 3.5 : 0; x < w; x += 7) { g.beginPath(); g.arc(x, y, 1.9, 0, 7); g.fill(); }
      });
      grille.wrapS = grille.wrapT = T.RepeatWrapping; grille.repeat.set(2, 1.4);
      const shell = new T.Mesh(new T.CylinderGeometry(R, R * 1.02, H - 40, 64, 1, true), std(0xffffff, 0.85, 0, { map: grille }));
      shell.rotation.x = Math.PI / 2; shell.position.z = H / 2; body.add(shadow(shell));
      // rounded shoulders top and bottom
      const lip = (z, flip) => { const t = new T.Mesh(new T.TorusGeometry(R - 20, 20, 12, 64, Math.PI * 2), std(0x18181a, 0.6)); t.position.z = z; body.add(shadow(t)); };
      lip(H - 20); lip(20);
      const cap = new T.Mesh(new T.CircleGeometry(R - 20, 64), std(0x1c1c1e, 0.55)); cap.position.z = H; body.add(cap);
      const base = new T.Mesh(new T.CircleGeometry(R - 20, 64), std(0x111111, 0.8)); base.rotation.x = Math.PI; base.position.z = 1; body.add(base);
      // the volume slider: a long rounded groove across the top
      const groove = new T.Mesh(new T.CapsuleGeometry(9, 130, 6, 16), std(0x0a0a0a, 0.7));
      groove.rotation.set(0, 0, 0.45); groove.scale.z = 0.4; groove.position.z = H + 0.5; body.add(groove);
      // touch marks and the status light
      [[-55, 30], [55, -30], [0, 70]].forEach(([x, y]) => { const d = new T.Mesh(new T.CircleGeometry(4, 10), std(0x333336, 0.5)); d.position.set(x, y, H + 0.6); body.add(d); });
      const led = new T.Mesh(new T.CircleGeometry(5, 12), new T.MeshBasicMaterial({ color: 0x333333, toneMapped: false }));
      led.position.set(-30, -72, H + 0.7); body.add(led);
      speaker.userData.led = led;
      body.scale.y = 1.06; // a touch deeper than wide
    }
    // music notes that drift up while it plays
    const noteTexs = ["♪", "♫"].map((ch) => tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#f3d27a"; g.font = "52px serif"; g.textAlign = "center"; g.fillText(ch, w / 2, 50); }));
    const notes = [0, 1, 2].map((i) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: noteTexs[i % 2], transparent: true, depthWrite: false, opacity: 0 }));
      s.scale.set(60, 60, 1); s.visible = false; tall.add(s); return s;
    });
    let playing = false, spController = null, spLoading = false;
    const player = document.createElement("div");
    player.className = "desk-player";
    player.innerHTML = '<button type="button" class="desk-player-x" aria-label="Close the player">×</button><div class="desk-player-slot"></div>';
    stage.appendChild(player);
    player.querySelector(".desk-player-x").addEventListener("click", (e) => {
      e.stopPropagation();
      if (spController) spController.pause();
      player.classList.remove("on"); playing = false; retipSpeaker();
    });
    const songTip = () => {
      const s = media.song;
      if (!s || !s.spotify) return "speaker · no song on it yet";
      return `speaker · <b>${s.title}</b>${s.artist ? " · " + s.artist : ""} · ${playing ? "click to pause" : "click to play"}`;
    };
    const retipSpeaker = () => retip(speaker, songTip());
    const trackUri = (u) => { const m = String(u).match(/track[/:]([A-Za-z0-9]+)/); return m ? "spotify:track:" + m[1] : null; };
    function loadSpotify(uri) {
      // Spotify's own embed, loaded only once someone actually clicks the speaker
      spLoading = true;
      window.onSpotifyIframeApiReady = (API) => {
        const slot = player.querySelector(".desk-player-slot");
        API.createController(slot, { uri, width: "100%", height: 80 }, (c) => {
          spController = c; spLoading = false;
          c.addListener("playback_update", (e) => { playing = !e.data.isPaused; retipSpeaker(); dirty = true; });
          c.addListener("ready", () => c.play());
        });
      };
      const sc = document.createElement("script");
      sc.src = "https://open.spotify.com/embed/iframe-api/v1"; sc.async = true;
      document.head.appendChild(sc);
    }
    hot(speaker, songTip(), () => {
      const s = media.song, uri = s && trackUri(s.spotify);
      if (!uri) { fx("beep"); return; }
      player.classList.add("on");
      if (spController) { spController.togglePlay(); return; }
      if (!spLoading) loadSpotify(uri);
    });
    function stepSpeaker(now) {
      speaker.userData.led.material.color.set(playing ? 0x3fdc6a : 0x333333);
      // a beat at ~118 bpm while playing: the whole speaker breathes a little
      const beat = playing ? Math.pow(Math.max(0, Math.sin(now / 1000 * Math.PI * 118 / 60)), 8) : 0;
      const k = 1 + beat * 0.015;
      speaker.userData.body.scale.set(k, 1.06 * k, 1 + beat * 0.01);
      notes.forEach((n, i) => {
        if (!playing && n.material.opacity <= 0) { n.visible = false; return; }
        const t = ((now / 2600) + i / 3) % 1;
        n.visible = true;
        n.position.copy(V(SPK.x - 60 + i * 50 + Math.sin(t * 6 + i) * 30, SPK.y + 40, SPK.z + 320 + t * 280));
        n.material.opacity = playing ? Math.sin(t * Math.PI) * 0.9 : Math.max(0, n.material.opacity - 0.05);
      });
    }

    // the movie CDs: jewel cases lying flat, spines facing the room
    const cdGrp = put(new T.Group(), 770, 175, 1604, tall);
    const CD_COLORS = [0x1d2b4f, 0x7a1f1f, 0x1f4a35, 0x2b2b2b, 0x8a5a14, 0x4a2b5a, 0x16505a, 0x5a3a1a];
    function buildCDs(list) {
      cdGrp.clear();
      const r = seeded(31);
      const items = list.length ? list.slice(0, 10) : Array.from({ length: 6 }, () => null);
      items.forEach((m, i) => {
        const col = CD_COLORS[i % CD_COLORS.length];
        const css = "#" + col.toString(16).padStart(6, "0");
        const label = m ? String(m.title || "").toUpperCase() : "";
        const spine = tex(1024, 72, (g, w, h) => {
          g.fillStyle = css; g.fillRect(0, 0, w, h);
          g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 0, w, 6);
          g.fillStyle = "#f3efe4"; g.font = `52px Anton, Impact, "Arial Narrow", sans-serif`; g.textBaseline = "middle";
          let px = 52; while (g.measureText(label).width > w - 200 && px > 24) { px -= 2; g.font = `${px}px Anton, Impact, sans-serif`; }
          g.textAlign = "left"; g.fillText(label, 36, h / 2 + 2);
          if (m && m.year) { g.textAlign = "right"; g.font = `30px Anton, Impact, sans-serif`; g.fillText(String(m.year), w - 30, h / 2 + 2); }
        });
        const cover = tex(512, 450, (g, w, h) => {
          g.fillStyle = css; g.fillRect(0, 0, w, h);
          g.fillStyle = "rgba(255,255,255,.08)"; g.fillRect(0, 0, w * 0.12, h);
          g.fillStyle = "#f3efe4"; g.textAlign = "center"; g.textBaseline = "middle";
          let px = 60; g.font = `${px}px Anton, Impact, sans-serif`;
          while (g.measureText(label).width > w - 80 && px > 26) { px -= 2; g.font = `${px}px Anton, Impact, sans-serif`; }
          g.fillText(label, w / 2, h / 2);
        });
        const clear = std(0xdfe6ea, 0.08, 0, { transparent: true, opacity: 0.35 });
        const ins = std(0xffffff, 0.5, 0, { map: spine }), top = std(0xffffff, 0.35, 0, { map: cover });
        const c = box(284, 250, 20, [clear, clear, clear, ins, top, clear]);
        const g = new T.Group(); g.add(c);
        g.position.set((r() - 0.5) * 18, 0, i * 21); g.rotation.z = (r() - 0.5) * 0.08;
        g.userData.home = g.position.y; g.userData.pull = 60;
        cdGrp.add(g);
        if (!shelfBooks.includes(g)) shelfBooks.push(g);
        hot(g, m ? `<b>${m.title}</b>${m.year ? " · " + m.year : ""}${m.note ? " · " + m.note : ""}` : "movie CDs · Karan's favourites go here", null, { drawer: g });
      });
      dirty = true;
    }
    buildCDs([]);
    fetch(new URL("../img/shelf/media.json", BASE).href)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((d) => {
        media.song = d.song || null; media.movies = Array.isArray(d.movies) ? d.movies : [];
        // drop the placeholders' hit targets before the real cases go in
        for (let i = hits.length - 1; i >= 0; i--) { let o = hits[i]; while (o && o !== cdGrp) o = o.parent; if (o) hits.splice(i, 1); }
        for (let i = shelfBooks.length - 1; i >= 0; i--) if (shelfBooks[i].parent === cdGrp) shelfBooks.splice(i, 1);
        buildCDs(media.movies);
        retipSpeaker();
      });

    // the label on the shelf edge, and the marker scrawl
    const labelTex = tex(1024, 160, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#1c1c1c"; g.font = hand(118); g.fillText("Karan Sharma", 10, 112);
      g.fillStyle = "#fff"; g.fillRect(700, 40, 240, 86); g.strokeStyle = "#999"; g.lineWidth = 3; g.strokeRect(700, 40, 240, 86);
      g.fillStyle = "#333"; g.font = hand(64); g.fillText("karan", 752, 104);
    });
    const label = front(820, 128, new T.MeshStandardMaterial({ map: labelTex, transparent: true, roughness: 0.8 }));
    label.position.copy(V(2330, 362, 1090));
    tall.add(label);
    hot(label, "Karan's shelf · labelled, so nothing walks off");
    const scr = front(420, 66, new T.MeshBasicMaterial({ map: tex(512, 80, (g) => { g.fillStyle = "#151515"; g.font = "900 54px system-ui, sans-serif"; g.fillText("KARAN SHARMA", 8, 62); }), transparent: true }));
    scr.position.copy(V(620, 362, 1122)); tall.add(scr);
    // a sketch of the arm taped to the wall
    const sketchTex = tex(400, 480, (g, w, h) => { g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, w, h); });
    const sk = front(300, 360, std(0xffffff, 0.9, 0, { map: sketchTex }));
    sk.rotation.y = 0.04; sk.position.copy(V(3170, -6, 800)); tall.add(sk);
    const img = new Image();
    img.onload = () => redraw(sketchTex, (g, w, h) => {
      g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, w, h);
      g.drawImage(img, 30, 40, w - 60, h - 70);
      g.fillStyle = "rgba(233,220,167,.85)"; g.fillRect(w / 2 - 60, 0, 120, 34);
    });
    img.src = new URL("../img/doodles/arm.svg", BASE).href;

    /* ================================================================ */
    /* parts organiser                                                   */
    /* ================================================================ */
    const org = put(new T.Group(), 290, 490, TOP, tall); // clear of the board on the left wall
    org.add(rbox(420, 220, 620, 8, std(0x5d7f9a, 0.5, 0.1)));
    const drawerMat = std(0xd6e4ec, 0.15, 0, { transparent: true, opacity: 0.6 });
    const drawers = [];
    const bits = [0xb9b9b9, 0x9a9a9a, 0xe8463a, 0xc9a96e, 0xb88a4a, 0x2a62c9, 0xf2f2f2, 0x222222, 0x2b6cb0, 0xffffff, 0x8d8d8d, 0xeeeeee, 0xd9b34a, 0x333333, 0x111111, 0xd6b44a, 0x555555, 0xaaaaaa, 0x77aa55, 0xcc55aa];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
      const dw = new T.Group();
      dw.add(rbox(88, 200, 100, 6, drawerMat));
      const stuff = new T.Mesh(new T.BoxGeometry(60, 150, 28), std(bits[r * 4 + c], 0.5, 0.3)); stuff.position.z = 18; dw.add(stuff);
      const hd = new T.Mesh(new T.BoxGeometry(30, 10, 8), std(0x222222, 0.4)); hd.position.set(0, -104, 50); dw.add(hd);
      dw.position.set(-153 + c * 102, -16, 30 + (4 - r) * 114);
      dw.userData.home = dw.position.y;
      org.add(dw);
      drawers.push(dw);
      hot(dw, "parts organiser", null, { drawer: dw });
    }

    /* ================================================================ */
    /* monitors                                                          */
    /* ================================================================ */
    const blackPlastic = std(0x1c1c1e, 0.45, 0.1), darkMetal = std(0x2a2a2c, 0.35, 0.6);
    function monitor(x, screenTex, tip, click) {
      const g = put(new T.Group(), x, 390, TOP, tall);
      g.add(rbox(420, 240, 18, 8, darkMetal));
      const neck = rbox(110, 44, 330, 10, darkMetal); neck.position.y = 60; g.add(neck);
      const head = new T.Group(); head.position.set(0, 30, 290); head.rotation.x = 0.06; g.add(head);
      head.add(rbox(1180, 48, 700, 14, blackPlastic));
      const scrn = front(1140, 642, glow(screenTex)); scrn.position.set(0, -24.5, 368); head.add(scrn);
      hot(head, tip, click);
      return head;
    }

    /* ---- terminal ---- */
    const buf = [];
    const plain = document.querySelector("main.cover");
    const entries = plain ? [...plain.querySelectorAll('.timeline a[href^="entries/"]')].map((a) => ({
      id: a.getAttribute("href").match(/entries\/(\d{3})/)[1],
      title: a.textContent.replace(/^\s*\d{3}\s*[·:.-]?\s*/, "").trim(),
    })) : [];
    const mail = plain && plain.querySelector('a[href^="mailto:"]');
    const gh = plain && plain.querySelector('a[href*="github.com"]');
    const sub = plain && plain.querySelector(".cover-sub");
    let caret = true;
    const TM = 84; // left margin: the organiser covers the screen's left edge in the keyboard close-up
    const termTex = tex(1140, 642, (g, w, h) => {
      g.fillStyle = "#0e1316"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#1c2328"; g.fillRect(0, 0, w, 34);
      ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 26, 17, 8, 0, 7); g.fill(); });
      g.fillStyle = "#8a9aa3"; g.font = "18px ui-monospace, monospace"; g.fillText("karan@desk: ~", w / 2 - 70, 23);
      g.font = "26px ui-monospace, 'DejaVu Sans Mono', monospace";
      const lh = 34, lines = buf.slice(-15);
      const y0 = h - 22 - lh * (lines.length + 1);
      lines.forEach((l, i) => {
        let x = TM;
        l.forEach(([t, c]) => { g.fillStyle = c; g.fillText(t, x, y0 + lh * (i + 1)); x += g.measureText(t).width; });
      });
      g.fillStyle = "#7fd1a0"; g.fillText("karan@desk:~$ ", TM, h - 22);
      const px = TM + g.measureText("karan@desk:~$ ").width;
      g.fillStyle = "#fff"; g.fillText(input.value, px, h - 22);
      if (caret) { g.fillStyle = "#7fd1a0"; g.fillRect(px + g.measureText(input.value).width + 2, h - 46, 14, 30); }
    });
    const C = { n: "#cfe8d2", d: "#7f9c86", h: "#f3d27a", p: "#7fd1a0" };
    const print = (text, color = C.n) => { String(text).split("\n").forEach((l) => buf.push([[l, color]])); while (buf.length > 40) buf.shift(); redraw(termTex); };
    const printSegs = (segs) => { buf.push(segs); redraw(termTex); };
    const cmds = {
      help: () => print("ls · ls -l · open <nnn> · whoami · contact · date\nlamp · coffee · solder · cube · blink · clear", C.d),
      ls: (a) => {
        if (a[0] === "-l") { entries.forEach((e) => buf.push([[e.id + "  ", C.h], [e.title.slice(0, 52), C.n]])); redraw(termTex); return; }
        const ids = entries.map((e) => e.id);
        for (let i = 0; i < ids.length; i += 11) print(ids.slice(i, i + 11).join("  "));
        print("open <nnn> to read one. ls -l for titles.", C.d);
      },
      open: (a) => {
        const arg = a[0] || "";
        if (/^cont/.test(arg)) { print("opening the contents..."); setTimeout(() => openAt("contents"), 350); return; }
        const e = entries.find((x) => x.id === arg.replace(/\D/g, "").padStart(3, "0"));
        if (!e) return print(`no entry "${arg}". try ls`);
        print(`opening entry ${e.id}: ${e.title.slice(0, 40)}...`);
        setTimeout(() => openAt(e.id), 450);
      },
      whoami: () => print("karan\n" + (sub ? sub.textContent.trim() : "")),
      contact: () => print([mail && "email   " + mail.getAttribute("href").slice(7), gh && "github  " + gh.getAttribute("href").replace(/^https?:\/\//, "")].filter(Boolean).join("\n")),
      date: () => print(new Date().toString().slice(0, 24)),
      lamp: () => { toggleNight(); print(night ? "lamp on. room lights off." : "lights back on."); },
      coffee: () => { sip(); print(level <= 0 ? "empty. type coffee again to refill." : "*sip*"); },
      solder: () => { heat(); print(target > 100 ? "heating to 350°C. don't touch the tip." : "cooling down."); },
      cube: () => { cubeClick(); print(cubeSolved ? "solving..." : "scrambling..."); },
      blink: () => { nextMode(); print("pin 13: " + MODES[mi][0]); },
      clear: () => { buf.length = 0; redraw(termTex); },
      sudo: () => print("karan is not in the sudoers file. this incident will be reported."),
      rm: () => print("nope. the notebook stays."),
      exit: () => print("there is no exit. click the notebook to open it."),
      echo: (a) => print(a.join(" ")),
    };
    cmds.cd = cmds.cat = cmds.less = cmds.open;
    cmds.dir = cmds.ls;
    function run() {
      const line = input.value.trim();
      input.value = "";
      printSegs([["karan@desk:~$ ", C.p], [line, "#fff"]]);
      if (!line) return;
      const [c, ...a] = line.split(/\s+/);
      const f = cmds[c.toLowerCase()];
      f ? f(a) : print(`command not found: ${c}. try help`);
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); run(); }
      if (e.key === "Escape" && zoomExit) { e.preventDefault(); zoomExit(); }
      e.stopPropagation(); // typing here never turns pages
    });
    input.addEventListener("input", () => redraw(termTex));
    setInterval(() => {
      if (active && document.activeElement === input) { caret = !caret; redraw(termTex); }
      else if (!caret) { caret = true; redraw(termTex); }
    }, 530);
    printSegs([["karan@desk:~$ ", C.p], ["cat README", "#fff"]]);
    print("22 entries. everything that broke.");
    printSegs([["type ", C.n], ["help", C.h], [", or click the notebook to open it.", C.n]]);
    const monL = monitor(1060, termTex, "terminal · click and type help", () => zoomIn());
    // a sticky note on the bezel: how many of the desk's things this visitor has found
    const noteTex = tex(300, 300, () => {});
    const foundN = () => [...known].filter((k) => foundSet.has(k)).length;
    // one nudge per thing, in the order a visitor is likely to miss them
    const HINTS = {
      "terminal": "the left screen takes orders. type help",
      "the crop-gap work": "the plot on the right screen has a story",
      "keyboard": "sit down at the keys",
      "hippo ooshie": "someone small sits on the monitor. squeeze",
      "casio a130": "the old watch has a light",
      "desk lamp": "turn the lights down",
      "coffee": "you look thirsty",
      "rubik's cube": "six colours, all mixed up. spin it",
      "soldering iron": "something on the right gets very hot",
      "wire spools": "pull some wire off a spool",
      "arduino": "a tiny board blinks. change its mind",
      "multimeter": "measure something",
      "hot glue gun": "not a structural material",
      "the tello drone": "it wants to fly",
      "the tiny satellite": "small thing, dreams of orbit",
      "memory board": "the green wall remembers",
      "whiteboard": "the board by the window needs wiping",
      "3d printer": "make a gear",
      "filament spools": "change colour, up on the printer",
      "the bin of everything that broke": "rummage through what broke",
      "speaker": "the shelf has a favourite song",
    };
    let hintI = 0, hintUntil = 0, hintText = "";
    let resetArmed = 0;
    function nextHint() {
      const left = [...known].filter((k) => !foundSet.has(k));
      if (!left.length) {
        // all found: first click asks, a second click within 5 s starts over
        if (performance.now() < resetArmed) {
          resetArmed = 0; foundSet = new Set();
          try { localStorage.removeItem("nb-found"); } catch (_) {}
          hintText = ""; fx("zip"); paintNote(); retip(note, noteTip());
          return;
        }
        resetArmed = performance.now() + 5000;
        hintText = "start over? click again";
        fx("click"); paintNote();
        setTimeout(() => { if (performance.now() >= resetArmed - 50) { resetArmed = 0; hintText = ""; paintNote(); } }, 5000);
        return;
      }
      const k = left[hintI++ % left.length];
      hintText = HINTS[k] || `look for the ${k}`;
      hintUntil = performance.now() + 7000;
      fx("click"); paintNote();
      setTimeout(() => { if (performance.now() >= hintUntil - 50) { hintText = ""; paintNote(); } }, 7000);
    }
    function wrapText(g, text, maxW) {
      const out = []; let line = "";
      text.split(" ").forEach((w) => { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line);
      return out;
    }
    function paintNote() {
      const n = foundN(), t = known.size, all = n >= t;
      redraw(noteTex, (g, w, h) => {
        g.fillStyle = "#f7e26b"; g.fillRect(0, 0, w, h);
        g.fillStyle = "rgba(0,0,0,.06)"; g.fillRect(0, 0, w, 46);
        g.fillStyle = "rgba(120,90,0,.08)"; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        g.fillStyle = "#1f2c58"; g.textAlign = "center";
        if (hintText) {
          g.font = hand(40); g.fillStyle = "#b8231c"; g.fillText(resetArmed ? "hmm" : "hint:", w / 2, 70);
          g.fillStyle = "#1f2c58";
          let px = 46; g.font = hand(px);
          let lines = wrapText(g, hintText, w - 36);
          while (lines.length > 4 && px > 30) { px -= 4; g.font = hand(px); lines = wrapText(g, hintText, w - 36); }
          lines.forEach((l, i) => g.fillText(l, w / 2, 122 + i * px * 0.95));
          return;
        }
        g.font = hand(54); g.fillText(all ? "you found" : "found", w / 2, 92);
        const big = all ? "all " + t : n + "/" + t;
        let px = 104; g.font = hand(px);
        while (g.measureText(big).width > w - 40 && px > 50) { px -= 4; g.font = hand(px); } // always fits the note
        g.fillText(big, w / 2, 192);
        g.font = hand(48); g.fillText(all ? "nice. \u2713" : "things", w / 2, 256);
      });
    }
    // stuck to the bottom ledge of the bezel by its glue strip, the rest hanging in the air, curling forward
    const NS = 190, GLUE = 40; // the top 40 units sit on the bezel (z 0..40), the rest hangs below
    const noteGeo = new T.PlaneGeometry(NS, NS, 1, 12);
    { const p = noteGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const below = Math.max(0, NS / 2 - GLUE - p.getY(i)); p.setZ(i, Math.pow(below / (NS - GLUE), 2) * 34); }
      noteGeo.computeVertexNormals(); }
    const note = new T.Mesh(noteGeo, std(0xffffff, 0.9, 0, { map: noteTex, emissive: 0xffffff, emissiveMap: noteTex, emissiveIntensity: 0.35, side: T.DoubleSide })); // a touch of glow: it sits in the monitor's shadow
    note.rotation.set(Math.PI / 2, 0, -0.06); // stand it up like the screen, then a slight in-plane tilt
    note.position.set(430, -27, GLUE - NS / 2); note.castShadow = true; monL.add(note);
    const noteTip = () => `sticky note · found ${foundN()} of ${known.size} things on this desk${foundN() >= known.size ? " · click to start over" : " · click for a hint"}`;
    hot(note, "sticky note", () => nextHint(), { noFind: true });
    onFound = () => { hintText = ""; paintNote(); retip(note, noteTip()); if (foundN() >= known.size) fx("beep"); };
    requestAnimationFrame(() => { paintNote(); retip(note, noteTip()); }); // once every thing has registered

    /* ---- NDVI plot ---- */
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const PTS = Array.from({ length: 170 }, () => {
      const x = 0.18 + rnd() * 0.7, n = (rnd() + rnd() + rnd() - 1.5) * 0.09;
      return [x, clamp(x * 0.96 + 0.03 + n, 0.05, 0.98)];
    });
    let shown = 0, holdT = 0, lastPlot = 0;
    const plotTex = tex(1140, 642, (g, W, H) => {
      g.fillStyle = "#1e1f22"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#2a2c30"; g.fillRect(0, 0, W, 30); g.fillRect(0, 30, 170, H);
      g.fillStyle = "#4a4d55";
      for (let i = 0; i < 16; i++) g.fillRect(20, 52 + i * 34, 70 + ((i * 37) % 60), 10);
      g.fillStyle = "#3d7be0"; g.fillRect(170, 0, 260, 30);
      g.fillStyle = "#ddd"; g.font = "17px system-ui"; g.fillText("scatter_recent_vs_prev.png", 180, 21);
      const X = 400, Y = 70, S = 520;
      g.fillStyle = "#fff"; g.fillRect(X - 60, Y - 44, S + 100, S + 70);
      g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(X, Y, S, S - 40);
      g.fillStyle = "#222"; g.font = "22px system-ui, sans-serif"; g.textAlign = "center";
      g.fillText("Recent vs Previous NDVI", X + S / 2, Y - 14);
      g.font = "16px system-ui, sans-serif"; g.fillText("previous NDVI", X + S / 2, Y + S - 12);
      g.textAlign = "left";
      const px = (v) => X + v * S, py = (v) => Y + (S - 40) * (1 - v);
      g.setLineDash([6, 6]); g.strokeStyle = "#999";
      g.beginPath(); g.moveTo(px(0), py(0)); g.lineTo(px(1), py(1)); g.stroke(); g.setLineDash([]);
      g.fillStyle = "rgba(31,119,180,.7)";
      for (let i = 0; i < shown; i++) { g.beginPath(); g.arc(px(PTS[i][0]), py(PTS[i][1]), 4.5, 0, 7); g.fill(); }
      if (shown >= PTS.length) {
        g.strokeStyle = "#d62728"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(px(0.15), py(0.174)); g.lineTo(px(0.92), py(0.913)); g.stroke();
      }
    });
    monitor(2320, plotTex, "the crop-gap work · <b>entry 016</b>", () => openAt("016"));

    /* ================================================================ */
    /* a hippo ooshie, perched on the top-left corner of the left monitor */
    /* (an original little figure in the style of the collectibles)      */
    /* ================================================================ */
    const hippo = new T.Group();
    const squish = new T.Group(); hippo.add(squish);
    {
      const vinyl = (c) => new T.MeshPhysicalMaterial({ color: c, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.4, sheenColor: new T.Color(0xffffff) });
      const skin = vinyl(0x9c8fc0), snoutM = vinyl(0xc7b2d6), pink = vinyl(0xf2a7c3), ink = std(0x111114, 0.15, 0.2);
      const blush = new T.MeshStandardMaterial({ color: 0xf28fb3, transparent: true, opacity: 0.55, roughness: 0.6 });
      const blob = (m, sx, sy, sz, x, y, z, seg = 32) => {
        const b = shadow(new T.Mesh(new T.SphereGeometry(1, seg, seg / 2), m));
        b.scale.set(sx, sy, sz); b.position.set(x, y, z); squish.add(b); return b;
      };
      blob(skin, 52, 58, 42, 0, 10, 50);                                   // body
      [[-30, -18], [30, -18], [-30, 36], [30, 36]].forEach(([x, y]) => {   // stubby legs + toe pads
        const leg = shadow(new T.Mesh(new T.CapsuleGeometry(15, 16, 6, 16), skin));
        leg.rotation.x = Math.PI / 2; leg.position.set(x, y, 22); squish.add(leg);
        blob(snoutM, 13, 13, 3, x, y - 6, 5, 16);
      });
      blob(skin, 7, 7, 7, 0, 66, 54, 12);                                  // tail
      blob(skin, 50, 44, 44, 0, -34, 106);                                 // head
      blob(snoutM, 52, 36, 30, 0, -70, 90);                                // snout
      [-17, 17].forEach((x) => blob(ink, 5.5, 3, 4, x, -103, 100, 12));    // nostrils
      [-22, 22].forEach((x) => {
        blob(ink, 9, 7, 10, x, -62, 128, 20);                              // eyes
        blob(std(0xffffff, 0.1), 2.8, 2, 2.8, x + 3, -69, 133, 10);        // eye shine
        blob(blush, 9, 3, 6, x * 1.75, -64, 104, 16);                      // cheeks
      });
      [-34, 34].forEach((x) => { blob(skin, 12, 8, 14, x, -26, 146, 16); blob(pink, 7, 3, 8, x, -32, 146, 12); }); // ears
      const smile = new T.Mesh(new T.TorusGeometry(13, 2.2, 6, 20, Math.PI * 0.8), ink);
      smile.rotation.x = Math.PI / 2; smile.rotation.y = Math.PI * 1.1; smile.position.set(0, -100, 82); squish.add(smile);
      [-6, 6].forEach((x) => { const tooth = new T.Mesh(rboxGeo(8, 4, 9, 2), std(0xffffff, 0.3)); tooth.position.set(x, -100, 64); squish.add(tooth); });
    }
    hippo.scale.setScalar(1.15);
    hippo.position.set(-590 + 95, -8, 700);  // on the bezel's top edge, left corner
    hippo.rotation.z = 0.35;                  // turned a little toward the notebook
    monL.add(hippo);
    let squishT = 0;
    hot(hippo, "hippo ooshie \u00B7 squeeze me", () => { squishT = performance.now(); fx("squeak"); });
    function stepHippo(now) {
      if (!squishT) return;
      const t = (now - squishT) / 1000, k = Math.exp(-t * 5) * Math.cos(t * 24) * 0.32;
      squish.scale.set(1 + k * 0.45, 1 + k * 0.45, 1 - k);
      if (t > 1.4) { squish.scale.set(1, 1, 1); squishT = 0; }
    }

    /* ================================================================ */
    /* tower                                                             */
    /* ================================================================ */
    const meshTex = tex(256, 512, (g, w, h) => {
      g.fillStyle = "#3a3c40"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#151619";
      for (let y = 90; y < h - 20; y += 12) for (let x = 24 + ((y / 12) % 2) * 6; x < w - 20; x += 12) { g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); }
      g.fillStyle = "#26272a"; g.fillRect(40, 50, w - 80, 10);
    });
    const tower = put(new T.Group(), 3112, 330, TOP, tall); // clear of the shelf post at x 3340
    tower.add(rbox(330, 620, 900, 10, std(0x3a3c40, 0.4, 0.5)));
    const tf = front(300, 870, std(0xffffff, 0.5, 0.4, { map: meshTex })); tf.position.set(0, -311, 450); tower.add(tf);
    const towerLed = front(18, 18, new T.MeshBasicMaterial({ color: 0x6fd0ff, toneMapped: false })); towerLed.position.set(0, -312, 840); tower.add(towerLed);
    hot(tower, "the workstation");

    /* ================================================================ */
    /* keyboard (echoes your keys), mouse (follows yours), watch          */
    /* ================================================================ */
    const kb = put(new T.Group(), 1698, 739, TOP);
    kb.add(rbox(1004, 302, 26, 10, std(0x1f1f21, 0.5, 0.2)));
    const U = 54;
    const rows = [
      [["Backquote", "`"], ["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"], ["Minus", "-"], ["Equal", "="], ["Backspace", "⌫", 2]],
      [["Tab", "tab", 1.5], ["KeyQ", "q"], ["KeyW", "w"], ["KeyE", "e"], ["KeyR", "r"], ["KeyT", "t"], ["KeyY", "y"], ["KeyU", "u"], ["KeyI", "i"], ["KeyO", "o"], ["KeyP", "p"], ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\", 1.5]],
      [["CapsLock", "caps", 1.75], ["KeyA", "a"], ["KeyS", "s"], ["KeyD", "d"], ["KeyF", "f"], ["KeyG", "g"], ["KeyH", "h"], ["KeyJ", "j"], ["KeyK", "k"], ["KeyL", "l"], ["Semicolon", ";"], ["Quote", "'"], ["Enter", "enter", 2.25]],
      [["ShiftLeft", "shift", 2.25], ["KeyZ", "z"], ["KeyX", "x"], ["KeyC", "c"], ["KeyV", "v"], ["KeyB", "b"], ["KeyN", "n"], ["KeyM", "m"], ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "shift", 2.75], [null, "", 1], ["ArrowUp", "↑"]],
      [["ControlLeft", "ctrl", 1.25], ["MetaLeft", "❖", 1.25], ["AltLeft", "alt", 1.25], ["Space", "", 6.25], ["AltRight", "alt", 1.25], ["ContextMenu", "", 1.25], ["ControlRight", "ctrl", 2.5], ["ArrowLeft", "←"], ["ArrowDown", "↓"], ["ArrowRight", "→"]],
    ];
    const keys = {};
    const keyMat = std(0x2f3033, 0.55, 0.1), keyLit = std(0x57606a, 0.4, 0.1, { emissive: 0x2a6b48, emissiveIntensity: 0.6 });
    const legendTex = tex(2048, 620);
    const lg = legendTex.userData.g, LK = 2048 / 1004;
    lg.fillStyle = "#dcdcdc";
    rows.forEach((row, r) => {
      let x = 0;
      row.forEach(([code, lab, w = 1]) => {
        if (code) {
          const k = new T.Mesh(rboxGeo(w * U - 7, U - 7, 16, 5), keyMat.clone()); // own material: each key glows on its own
          k.castShadow = true;
          const kx = -502 + 16 + (x + w / 2) * U, ky = 151 - 16 - (r + 0.5) * U;
          k.position.set(kx, ky, 26);
          kb.add(k);
          keys[code] = { k, lab };
          hot(k, "keyboard · click to sit down and type", () => (typing() ? pressKey(code) : zoomIn()), { key: code });
          lg.font = `600 ${lab.length > 1 ? 24 : 40}px system-ui, sans-serif`;
          lg.fillText(lab, (kx + 502 - (w * U) / 2 + 12) * LK, (151 - ky - U / 2 + 34) * LK);
        }
        x += w;
      });
    });
    legendTex.needsUpdate = true;
    const legend = new T.Mesh(new T.PlaneGeometry(1004, 302), new T.MeshBasicMaterial({ map: legendTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    legend.position.z = 42.5; kb.add(legend);
    // a pressed key sinks and lights up; the light fades after it comes back up
    const glowing = new Set();
    const down = (code, on) => {
      const o = keys[code]; if (!o) return;
      o.held = on;
      if (on) { o.glow = 1; glowing.add(o); }
      o.k.position.z = on ? 18 : 26;
      paintKey(o); wake();
    };
    function paintKey(o) {
      const m = o.k.material;
      m.color.copy(keyMat.color).lerp(keyLit.color, o.glow);
      m.emissive.setHex(0x3fdc6a);
      m.emissiveIntensity = o.glow * 1.3;
      dirty = true;
    }
    function stepKeys(dt) {
      glowing.forEach((o) => {
        if (o.held) return;
        o.glow = Math.max(0, o.glow - dt / 0.35);
        paintKey(o);
        if (!o.glow) glowing.delete(o);
      });
    }
    function pressKey(code) {
      down(code, true); setTimeout(() => down(code, false), 120);
      fx("click");
      const lab = keys[code].lab;
      if (code === "Enter") run();
      else if (code === "Backspace") input.value = input.value.slice(0, -1);
      else if (code === "Space") input.value += " ";
      else if (lab.length === 1 && !/^Arrow/.test(code)) input.value += lab;
      redraw(termTex);
    }
    // capture phase: the terminal input stops its own keydowns, the echo still sees them
    addEventListener("keydown", (e) => {
      if (!active) return;
      down(e.code, true);
      if (typing() && !e.repeat && keys[e.code]) fx("click");
    }, true);
    addEventListener("keyup", (e) => down(e.code, false));
    addEventListener("blur", () => Object.keys(keys).forEach((c) => down(c, false)));

    put(rbox(320, 340, 5, 18, std(0x232528, 0.95)), 2410, 730, TOP);
    const mouse = put(new T.Group(), 2410, 730, TOP + 5);
    {
      const g = new T.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
      g.rotateX(Math.PI / 2);
      const body = shadow(new T.Mesh(g, std(0x1b1c1e, 0.32, 0.1)));
      body.scale.set(52, 84, 36); mouse.add(body);
      const wh = new T.Mesh(new T.CylinderGeometry(9, 9, 10, 20), std(0x555555, 0.5)); wh.rotation.z = Math.PI / 2; wh.position.set(0, 44, 32); mouse.add(wh);
      const rgb = new T.Mesh(new T.TorusGeometry(40, 2.5, 6, 30, Math.PI * 0.6), new T.MeshBasicMaterial({ color: 0x3fdc6a, toneMapped: false }));
      rgb.rotation.z = -Math.PI * 0.8; rgb.position.set(0, -10, 14); rgb.scale.set(1.1, 1.6, 1); mouse.add(rgb);
    }

    /* Casio A130WE: chamfered steel case, black frame, light LCD with an analog-style
       circle, a seconds pie, day/date and big 7-segment time. Lies flat, 12 o'clock to the back. */
    const watch = put(new T.Group(), 1085, 720, TOP);
    watch.rotation.z = -0.08;
    watch.scale.setScalar(0.83); // true size: keys are 54 units for 19.05 mm, the case is 33.9 x 40.5 mm
    const steel = std(0xc8ccd0, 0.3, 1.0);
    const steelDark = std(0x9ea3a8, 0.4, 1.0);
    {
      const octa = (w, l, c) => {
        const s = new T.Shape(), x = w / 2, y = l / 2;
        s.moveTo(-x + c, -y); s.lineTo(x - c, -y); s.lineTo(x, -y + c); s.lineTo(x, y - c);
        s.lineTo(x - c, y); s.lineTo(-x + c, y); s.lineTo(-x, y - c); s.lineTo(-x, -y + c); s.closePath();
        return s;
      };
      const ext = (shape, depth, bev) => { const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2 }); g.translate(0, 0, bev); return g; };
      const caseM = shadow(new T.Mesh(ext(octa(110, 132, 17), 22, 3), steel)); watch.add(caseM);
      // the raised bezel step around the crystal
      const bez = shadow(new T.Mesh(ext(octa(100, 112, 13), 3, 1.5), steelDark)); bez.position.z = 25; watch.add(bez);
      // four pushers, two each side
      [-1, 1].forEach((sx) => [-26, 30].forEach((y) => {
        const p = new T.Mesh(new T.CylinderGeometry(5, 5, 12, 14), steel);
        p.rotation.z = Math.PI / 2; p.position.set(sx * 60, y, 15); watch.add(shadow(p));
      }));
      // flat-link bracelet laid open
      for (const dir of [-1, 1]) for (let i = 0; i < 7; i++) {
        const l = rbox(66, 19, 8, 2, i % 2 ? steelDark : steel);
        l.position.set(0, dir * (75 + i * 21), 0); watch.add(l);
      }
      [-1, 1].forEach((dir) => { const e = rbox(72, 16, 13, 3, steel); e.position.set(0, dir * 64, 2); watch.add(e); });
    }
    const two = (n) => String(n).padStart(2, "0");
    const SEG = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", " ": "" };
    function seg7(g, ch, x, y, w, h, t, ink) {
      // italic 7-segment digit; faint ghost segments underneath like a real LCD
      const sk = 0.12 * h, P = (px, py) => [x + px * w + (1 - py) * sk, y + py * h];
      const segs = {
        a: [[0.1, 0], [0.9, 0]], b: [[1, 0.06], [1, 0.47]], c: [[1, 0.53], [1, 0.94]], d: [[0.1, 1], [0.9, 1]],
        e: [[0, 0.53], [0, 0.94]], f: [[0, 0.06], [0, 0.47]], g: [[0.1, 0.5], [0.9, 0.5]],
      };
      g.lineCap = "butt"; g.lineWidth = t;
      for (const [k, [[x0, y0], [x1, y1]]] of Object.entries(segs)) {
        g.strokeStyle = (SEG[ch] || "").includes(k) ? ink : "rgba(0,0,0,.05)";
        g.beginPath(); g.moveTo(...P(x0, y0)); g.lineTo(...P(x1, y1)); g.stroke();
      }
    }
    const watchTex = tex(512, 560, (g, w, h) => {
      const d = new Date(), H = d.getHours(), M = d.getMinutes(), S = d.getSeconds();
      const gold = "#d9a93a", ink = "#20231c";
      g.fillStyle = "#070707"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#5d6166"; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
      g.textBaseline = "alphabetic";
      g.fillStyle = "#f2f2f2"; g.font = "800 34px Arial, sans-serif"; g.textAlign = "left"; g.fillText("CASIO", 52, 58);
      g.fillStyle = gold; g.font = "italic 700 22px Arial, sans-serif"; g.textAlign = "right"; g.fillText("◀ ILLUMINATOR ▶", w - 46, 56);
      // side labels by the pushers
      g.fillStyle = "#e8e8e8"; g.font = "600 15px Arial, sans-serif"; g.textAlign = "center";
      const side = (txt, x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillText(txt, 0, 5); g.restore(); };
      side("ADJUST", 22, 175, -Math.PI / 2); side("MODE", 22, 375, -Math.PI / 2);
      side("LIGHT", w - 22, 175, Math.PI / 2); side("SEARCH", w - 22, 375, Math.PI / 2);
      g.fillStyle = gold; [[22, 115], [w - 22, 115], [22, 440], [w - 22, 440]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); });
      // the LCD
      const L = { x: 44, y: 76, w: w - 88, h: 400 };
      g.fillStyle = "#9fa392"; g.fillRect(L.x, L.y, L.w, L.h);
      g.strokeStyle = "#2b2d2a"; g.lineWidth = 3; g.strokeRect(L.x, L.y, L.w, L.h);
      // analog-style dial: tick ring, crosshair, centre square, hands
      const cx = L.x + 128, cy = L.y + 118, R = 96;
      g.strokeStyle = ink; g.fillStyle = ink;
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * Math.PI * 2, r0 = i % 5 ? R - 6 : R - 14;
        g.lineWidth = i % 5 ? 2 : 4; g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); g.stroke();
      }
      g.lineWidth = 1.5; g.strokeStyle = "rgba(32,35,28,.55)";
      [R * 0.62, R * 0.32].forEach((r) => { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); });
      g.beginPath(); g.moveTo(cx - R + 16, cy); g.lineTo(cx + R - 16, cy); g.moveTo(cx, cy - R + 16); g.lineTo(cx, cy + R - 16); g.stroke();
      g.fillRect(cx - 9, cy - 9, 18, 18);
      g.strokeStyle = ink; g.lineCap = "round";
      const hand = (a, r, lw) => { g.lineWidth = lw; g.beginPath(); g.moveTo(cx + Math.sin(a) * 14, cy - Math.cos(a) * 14); g.lineTo(cx + Math.sin(a) * r, cy - Math.cos(a) * r); g.stroke(); };
      hand(((H % 12) + M / 60) / 12 * Math.PI * 2, R * 0.5, 7);
      hand(M / 60 * Math.PI * 2, R * 0.82, 4);
      g.fillStyle = ink; g.font = "600 15px Arial, sans-serif"; g.textAlign = "center"; g.fillText("ALARM CHRONO", cx, L.y + 244);
      // seconds pie, top right
      const px = L.x + L.w - 70, py = L.y + 62, pr = 44;
      g.lineWidth = 3; g.beginPath(); g.arc(px, py, pr, 0, 7); g.stroke();
      for (let i = 0; i < 12; i++) {
        const a0 = i / 12 * Math.PI * 2 - Math.PI / 2;
        g.fillStyle = i < Math.floor(S / 5) + 1 ? ink : "rgba(0,0,0,.05)";
        g.beginPath(); g.moveTo(px, py); g.arc(px, py, pr - 6, a0 + 0.04, a0 + Math.PI / 6 - 0.04); g.closePath(); g.fill();
      }
      g.fillStyle = "#9fa392"; g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill();
      // day + date box
      const bx = L.x + L.w - 132, by = L.y + 126;
      g.strokeStyle = ink; g.lineWidth = 2; g.strokeRect(bx, by, 118, 104); g.beginPath(); g.moveTo(bx, by + 52); g.lineTo(bx + 118, by + 52); g.stroke();
      g.fillStyle = ink; g.font = "700 34px 'Arial Narrow', Arial, sans-serif"; g.textAlign = "left";
      g.fillText(["SU", "MO", "TU", "WE", "TH", "FR", "SA"][d.getDay()], bx + 8, by + 42);
      seg7(g, two(d.getDate())[0], bx + 66, by + 10, 18, 34, 5, ink); seg7(g, two(d.getDate())[1], bx + 90, by + 10, 18, 34, 5, ink);
      const mo = String(d.getMonth() + 1), dd = two(d.getDate());
      (mo.padStart(2, " ")).split("").forEach((c, i) => seg7(g, c, bx + 6 + i * 24, by + 62, 18, 34, 5, ink));
      g.fillRect(bx + 56, by + 78, 10, 4);
      dd.split("").forEach((c, i) => seg7(g, c, bx + 72 + i * 24, by + 62, 18, 34, 5, ink));
      // main time row
      g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x + 10, L.y + 262); g.lineTo(L.x + L.w - 10, L.y + 262); g.stroke();
      const h12 = H % 12 || 12, hs = String(h12).padStart(2, " ");
      g.fillStyle = H >= 12 ? ink : "rgba(0,0,0,.05)"; g.font = "700 26px Arial, sans-serif"; g.fillText("P", L.x + 12, L.y + 302);
      const ty = L.y + 278, tw = 44, th = 80;
      seg7(g, hs[0], L.x + 44, ty, tw, th, 9, ink); seg7(g, hs[1], L.x + 102, ty, tw, th, 9, ink);
      g.fillStyle = S % 2 ? "rgba(0,0,0,.05)" : ink; g.fillRect(L.x + 166, ty + 20, 8, 8); g.fillRect(L.x + 162, ty + 52, 8, 8);
      seg7(g, two(M)[0], L.x + 186, ty, tw, th, 9, ink); seg7(g, two(M)[1], L.x + 244, ty, tw, th, 9, ink);
      seg7(g, two(S)[0], L.x + 306, ty + 26, 28, 52, 7, ink); seg7(g, two(S)[1], L.x + 344, ty + 26, 28, 52, 7, ink);
      // labels printed on the frame under the LCD
      g.fillStyle = "#e8e8e8"; g.font = "600 15px Arial, sans-serif"; g.textAlign = "center";
      [["DST", 0.1], ["ALM", 0.3], ["SIG", 0.68], ["MUTE", 0.88]].forEach(([t, f]) => g.fillText(t, L.x + L.w * f, L.y + L.h + 22));
      g.font = "800 24px Arial, sans-serif"; g.fillStyle = "#f2f2f2";
      g.textAlign = "right"; g.fillText("WATER", w / 2 - 40, h - 26);
      g.textAlign = "left"; g.fillText("RESIST", w / 2 + 40, h - 26);
      g.strokeStyle = gold; g.lineWidth = 2.5; g.strokeRect(w / 2 - 30, h - 50, 60, 30);
      g.fillStyle = gold; g.font = "italic 800 22px Arial, sans-serif"; g.textAlign = "center"; g.fillText("WR", w / 2, h - 27);
    });
    const dialMat = std(0xffffff, 0.8, 0, { map: watchTex, emissive: 0xd8f2ff, emissiveMap: watchTex, emissiveIntensity: 0 });
    const wf = new T.Mesh(new T.PlaneGeometry(90, 98), dialMat); wf.position.set(0, 1, 31.4); watch.add(wf);
    // a faint glossy crystal over the dial
    const crys = new T.Mesh(new T.PlaneGeometry(92, 100), new T.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, roughness: 0.1, metalness: 0, envMapIntensity: 0.3 }));
    crys.position.set(0, 1, 32); watch.add(crys);
    let litUntil = 0;
    const illuminate = () => {
      fx("beep");
      litUntil = performance.now() + 2500;
      dialMat.emissiveIntensity = 0.9; dirty = true;
      setTimeout(() => { if (performance.now() >= litUntil - 20) { dialMat.emissiveIntensity = 0; dirty = true; } }, 2500);
    };
    hot(watch, "<b>Casio A130</b> · real time · click for the illuminator", illuminate);
    setInterval(() => { if (active && !document.hidden) redraw(watchTex); }, 1000);

    /* ================================================================ */
    /* lamp (night mode)                                                 */
    /* ================================================================ */
    const lampMat = std(0x2d3036, 0.35, 0.6);
    const lamp = new T.Group(); tall.add(lamp);
    const L1 = [260, 1180, 60], L2 = [360, 1060, 640], L3 = [800, 1180, 700], AIM = [1620, 1320, 0];
    put(cylZ(140, 150, 50, lampMat, 40), 250, 1180, TOP, lamp);
    lamp.add(rod(L1, L2, 13, lampMat), rod(L2, L3, 11, lampMat));
    [L1, L2].forEach((p) => { const j = shadow(new T.Mesh(new T.SphereGeometry(24, 20, 12), lampMat)); j.position.copy(V(...p)); lamp.add(j); });
    const aim = new T.Group(); aim.position.copy(V(...L3)); lamp.add(aim);
    aim.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), V(...AIM).sub(V(...L3)).normalize());
    aim.add(shadow(new T.Mesh(new T.LatheGeometry([[18, 0], [40, -10], [70, -60], [130, -170], [132, -176]].map(([r, z]) => new T.Vector2(r, z)), 48), std(0x3a4049, 0.3, 0.6, { side: T.DoubleSide }))));
    const bulbMat = new T.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffe2a0, emissiveIntensity: 0.4 });
    const bulb = new T.Mesh(new T.SphereGeometry(52, 24, 16), bulbMat); bulb.position.y = -120; aim.add(bulb);
    const spot = new T.SpotLight(0xffd9a0, 0.9, 0, 0.62, 0.75, 0);
    spot.position.copy(V(...L3));
    spot.target.position.copy(V(...AIM));
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0005;
    spot.shadow.camera.near = 200; spot.shadow.camera.far = 4000;
    scene.add(spot, spot.target);
    hot(lamp, "desk lamp · click for night mode", () => toggleNight());

    /* ================================================================ */
    /* coffee (sip)                                                      */
    /* ================================================================ */
    const cup = put(new T.Group(), 680, 1260, TOP, tall);
    const clearMat = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false });
    const cupMesh = lathe([[0, 0], [68, 0], [70, 4], [96, 300], [100, 304]], clearMat, 48); cupMesh.castShadow = false; cup.add(cupMesh);
    const coffeeG = new T.CylinderGeometry(1, 0.735, 1, 40); coffeeG.rotateX(Math.PI / 2); coffeeG.translate(0, 0, 0.5);
    const coffee = shadow(new T.Mesh(coffeeG, std(0x5a3620, 0.25))); coffee.position.z = 3; cup.add(coffee);
    const sleeveTex = tex(512, 96, (g, w, h) => {
      g.fillStyle = "#59b3c4"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#1d4a55"; g.lineWidth = 5;
      for (let x = -20; x < w; x += 70) { g.beginPath(); g.moveTo(x, 60); g.quadraticCurveTo(x + 17, 30, x + 35, 60); g.quadraticCurveTo(x + 52, 90, x + 70, 60); g.stroke(); }
      g.fillStyle = "#1d4a55"; g.font = "700 22px system-ui"; g.fillText("COLD BREW", 190, 28);
    });
    const sleeve = shadow(new T.Mesh(new T.CylinderGeometry(88.5, 81.5, 90, 48, 1, true), std(0xffffff, 0.7, 0, { map: sleeveTex })));
    sleeve.rotation.x = Math.PI / 2; sleeve.position.z = 175; cup.add(sleeve);
    const lid = lathe([[100, 304], [102, 310], [90, 318], [60, 340], [10, 346], [0, 346]], clearMat, 48); lid.castShadow = false; cup.add(lid);
    const straw = shadow(new T.Mesh(new T.CylinderGeometry(9, 9, 520, 16), std(0xf4f2ee, 0.4)));
    straw.position.set(30, 0, 300);
    straw.quaternion.setFromUnitVectors(UPY, new T.Vector3(0.25, 0.05, 1).normalize());
    cup.add(straw);
    let level = 1;
    function paintCup() {
      const hgt = 4 + level * 250, rTop = 68 + (hgt / 300) * 27;
      coffee.scale.set(rTop, rTop, hgt);
      coffee.visible = level > 0;
      retip(cup, level <= 0 ? "coffee · empty. click to refill" : "coffee · click to sip");
      refill.classList.toggle("on", level <= 0);
      dirty = true;
    }
    function sip() {
      if (level <= 0) { level = 1; fx("pour"); } else { level = Math.max(0, +(level - 0.25).toFixed(2)); fx("slurp"); }
      paintCup();
    }
    hot(cup, "coffee · click to sip", sip);
    paintCup();

    /* ================================================================ */
    /* rubik's cube: real layer turns                                    */
    /* ================================================================ */
    const cubeBase = put(new T.Group(), 2200, 1030, TOP);
    const spin = new T.Group(); cubeBase.add(spin);
    const cubeRoot = new T.Group(); cubeRoot.position.z = 62; spin.add(cubeRoot);
    const S3 = 40;
    const stickerMats = { px: 0xb71234, nx: 0xff5800, py: 0x0046ad, ny: 0x009b48, pz: 0xf5f5f5, nz: 0xffd500 };
    Object.keys(stickerMats).forEach((k) => (stickerMats[k] = std(stickerMats[k], 0.3)));
    const cubieG = rboxGeo(38, 38, 38, 6); cubieG.translate(0, 0, -19);
    const cubieMat = std(0x111111, 0.45), stickerG = new T.PlaneGeometry(33, 33);
    const cubies = [];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const cb = new T.Mesh(cubieG, cubieMat);
      cb.castShadow = true;
      cb.position.set(x * S3, y * S3, z * S3);
      const add = (k, px, py, pz, rx, ry) => { const s = new T.Mesh(stickerG, stickerMats[k]); s.position.set(px * 19.6, py * 19.6, pz * 19.6); s.rotation.set(rx, ry, 0); cb.add(s); };
      if (x === 1) add("px", 1, 0, 0, 0, Math.PI / 2);
      if (x === -1) add("nx", -1, 0, 0, 0, -Math.PI / 2);
      if (y === 1) add("py", 0, 1, 0, -Math.PI / 2, 0);
      if (y === -1) add("ny", 0, -1, 0, Math.PI / 2, 0);
      if (z === 1) add("pz", 0, 0, 1, 0, 0);
      if (z === -1) add("nz", 0, 0, -1, Math.PI, 0);
      cubeRoot.add(cb); cubies.push(cb);
    }
    hot(cubeRoot, "rubik's cube · drag to spin, click to scramble", null, { cube: true, find: "rubik's cube" });
    spin.rotation.z = 0.32;
    const pivot = new T.Group(); cubeRoot.add(pivot);
    const moveQ = [], history = [];
    let turning = null, cubeSolved = true;
    const AX = ["x", "y", "z"], m4 = new T.Matrix4();
    function stepCube(now) {
      if (!turning && moveQ.length) {
        const m = moveQ.shift();
        pivot.rotation.set(0, 0, 0); pivot.updateMatrixWorld();
        cubies.forEach((c) => { if (Math.round(c.position[m.axis] / S3) === m.layer) pivot.attach(c); });
        turning = { ...m, t0: now };
        if (moveQ.length % 3 === 0) fx("click");
      }
      if (!turning) return;
      const k = clamp((now - turning.t0) / turning.ms, 0, 1), e = 1 - Math.pow(1 - k, 3);
      pivot.rotation[turning.axis] = turning.dir * (Math.PI / 2) * e;
      dirty = true;
      if (k < 1) return;
      pivot.updateMatrixWorld();
      [...pivot.children].forEach((c) => {
        cubeRoot.attach(c);
        c.position.set(Math.round(c.position.x / S3) * S3, Math.round(c.position.y / S3) * S3, Math.round(c.position.z / S3) * S3);
        m4.makeRotationFromQuaternion(c.quaternion);
        const el = m4.elements;
        for (const i of [0, 1, 2, 4, 5, 6, 8, 9, 10]) el[i] = Math.round(el[i]);
        c.quaternion.setFromRotationMatrix(m4);
      });
      turning = null;
    }
    function cubeClick() {
      if (moveQ.length || turning) return;
      if (cubeSolved) {
        for (let i = 0; i < 18; i++) {
          const m = { axis: AX[(Math.random() * 3) | 0], layer: ((Math.random() * 3) | 0) - 1, dir: Math.random() < 0.5 ? 1 : -1, ms: 110 };
          history.push(m); moveQ.push(m);
        }
        cubeSolved = false;
      } else {
        while (history.length) { const m = history.pop(); moveQ.push({ ...m, dir: -m.dir, ms: 120 }); }
        cubeSolved = true;
      }
      retip(cubeRoot, cubeSolved ? "rubik's cube · drag to spin, click to scramble" : "rubik's cube · click to solve it");
    }

    /* ================================================================ */
    /* soldering station + iron                                          */
    /* ================================================================ */
    const sol = new T.Group(); tall.add(sol);
    const station = put(new T.Group(), 2620, 1300, TOP, sol);
    station.add(rbox(300, 220, 240, 14, std(0x3a3d42, 0.45, 0.3)));
    let temp = 25, target = 25, hissed = false;
    const segTex = tex(256, 100, (g, w) => {
      g.fillStyle = "#120d0b"; g.fillRect(0, 0, w, 100);
      g.fillStyle = temp > 180 ? "#ff7a3c" : "#ff4a2a"; g.font = "700 70px ui-monospace, monospace"; g.textAlign = "right";
      g.fillText(Math.round(temp) + "°", w - 18, 78); g.textAlign = "left";
    });
    const segFace = front(220, 86, glow(segTex)); segFace.position.set(0, -111, 170); station.add(segFace);
    const knob = shadow(new T.Mesh(new T.CylinderGeometry(30, 32, 26, 28), std(0x5a5e64, 0.3, 0.7))); knob.position.set(0, -120, 70); station.add(knob);
    const ironA = [2800, 1430, 30], ironB = [2900, 1240, 230], ironC = [2935, 1170, 300];
    sol.add(rod(ironA, ironB, 22, std(0x2f6fd6, 0.4, 0.1)), rod([2818, 1396, 48], [2860, 1316, 128], 25, std(0x1d1d1d, 0.8)), rod(ironB, ironC, 7, std(0xb9bcc1, 0.25, 1)));
    const tipMat = std(0x8a8a8a, 0.3, 0.9, { emissive: 0x000000 });
    const ironTip = shadow(new T.Mesh(new T.ConeGeometry(7, 46, 16), tipMat));
    {
      const dir = V(...ironC).sub(V(...ironB)).normalize();
      ironTip.position.copy(V(...ironC)).addScaledVector(dir, 23);
      ironTip.quaternion.setFromUnitVectors(UPY, dir);
    }
    sol.add(ironTip);
    const helix = [];
    for (let i = 0; i <= 80; i++) { const a = i * 0.55, t = i / 80; helix.push([2850 + 66 * t + Math.cos(a) * 34, 1350 - 120 * t + Math.sin(a) * 17, 40 + 170 * t]); }
    sol.add(tube(helix, 3.5, std(0xc8ccd2, 0.25, 1), 240));
    put(rbox(220, 110, 34, 8, std(0x6b6f75, 0.35, 0.6)), 2870, 1430, TOP, sol);
    put(rbox(180, 80, 26, 6, std(0xf2c94c, 0.95)), 2870, 1430, TOP + 34, sol);
    sol.add(tube([[2620, 1190, 120], [2700, 1150, 60], [2760, 1300, 10], [2770, 1470, 10], [2800, 1440, 30]], 8, std(0x1c1c1c, 0.6)));
    const puffTex = tex(64, 64, (g, w) => {
      const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      r.addColorStop(0, "rgba(240,240,240,.9)"); r.addColorStop(1, "rgba(240,240,240,0)");
      g.fillStyle = r; g.fillRect(0, 0, w, w);
    });
    const puffs = Array.from({ length: 7 }, (_, i) => {
      const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.ph = i / 7; sol.add(s); return s;
    });
    hot(sol, "soldering iron · click to heat", () => heat());
    function heat() { target = target > 100 ? 25 : 350; fx("click"); hissed = false; retip(sol, target > 100 ? "soldering iron · hot! click to switch off" : "soldering iron · click to heat"); }
    function stepIron(dt, now) {
      if (temp !== target) {
        temp = target > temp ? Math.min(target, temp + 85 * dt) : Math.max(target, temp - 40 * dt);
        redraw(segTex);
        const k = clamp((temp - 25) / 325, 0, 1);
        tipMat.color.setRGB(0.54 + 0.4 * k, 0.54 - 0.25 * k, 0.54 - 0.44 * k);
        tipMat.emissive.setRGB(k * k, 0.28 * k * k, 0.02 * k);
        if (temp > 300 && target > 100 && !hissed) { hissed = true; fx("hiss"); }
      }
      const on = clamp((temp - 180) / 120, 0, 1), b = ironTip.position;
      puffs.forEach((s) => {
        const ph = (now / 2600 + s.userData.ph) % 1;
        s.position.set(b.x + ph * 30 + Math.sin(ph * 9 + s.userData.ph * 6) * 10, b.y - ph * 8, b.z + 10 + ph * 200);
        const sc = 14 + ph * 46; s.scale.set(sc, sc * 1.4, 1);
        s.material.opacity = on * 0.22 * Math.sin(ph * Math.PI);
      });
    }

    /* ================================================================ */
    /* wire spools                                                       */
    /* ================================================================ */
    const spools = new T.Group(); tall.add(spools);
    const standMat = std(0x8a8f96, 0.35, 0.7);
    [3040, 3350].forEach((x) => { put(rbox(18, 70, 230, 4, standMat), x, 1270, TOP, spools); put(rbox(40, 200, 14, 4, standMat), x, 1270, TOP, spools); });
    spools.add(rod([3030, 1270, 220], [3360, 1270, 220], 9, std(0xc8ccd2, 0.25, 1)));
    const wheels = [], wireMats = [];
    [0xc0392b, 0x1e1e1e, 0xe7c11b].forEach((c, i) => {
      const w = put(new T.Group(), 3110 + i * 90, 1270, 220, spools);
      const stripes = tex(256, 64, (g, W, H) => {
        g.fillStyle = "#" + c.toString(16).padStart(6, "0"); g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(255,255,255,.18)"; for (let k = 0; k < W; k += 16) g.fillRect(k, 0, 3, H);
        g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(0, 0, 40, H);
      });
      wireMats.push(std(c, 0.45, 0.1));
      const coil = shadow(new T.Mesh(new T.CylinderGeometry(62, 62, 60, 40), std(0xffffff, 0.5, 0.1, { map: stripes }))); coil.rotation.z = Math.PI / 2; w.add(coil);
      [-34, 34].forEach((dx) => { const f = shadow(new T.Mesh(new T.CylinderGeometry(84, 84, 6, 40), std(0x2a2a2a, 0.5))); f.rotation.z = Math.PI / 2; f.position.x = dx; w.add(f); });
      wheels.push(w);
      hot(w, "wire spools · drag one down", null, { spool: i, find: "wire spools" });
    });
    const pulled = [null, null, null], pullLen = [0, 0, 0];
    function wireAt(i, L) {
      if (pulled[i]) { spools.remove(pulled[i]); pulled[i].geometry.dispose(); pulled[i] = null; }
      if (L < 4) return;
      const x = 3110 + i * 90;
      pulled[i] = tube([[x, 1290, 160], [x, 1300 + Math.min(L, 120) * 0.4, 60], [x + 6, 1320 + L * 0.5, TOP + 6], [x - 10, 1320 + L, TOP + 6]], 6, wireMats[i], 30);
      spools.add(pulled[i]);
    }

    /* ================================================================ */
    /* arduino + multimeter on pin 13                                    */
    /* ================================================================ */
    const ard = put(new T.Group(), 720, 1430, TOP);
    ard.add(rbox(300, 220, 8, 4, std(0x1f6fa6, 0.5, 0.1)));
    [[130, 22, 18, 0x202020, 50, 92], [170, 22, 18, 0x202020, 60, -92], [70, 60, 50, 0xc9cdd2, -150, 50, 0.3, 0.9],
     [50, 52, 44, 0x1a1a1a, -148, -60], [150, 44, 16, 0x161616, 50, 0], [24, 24, 10, 0xd8d8d8, -80, 70]]
      .forEach(([w, d, h, c, x, y, r = 0.5, m = 0.1]) => { const b = box(w, d, h, std(c, r, m)); b.position.set(x, y, 8); ard.add(b); });
    const ledMat = new T.MeshStandardMaterial({ color: 0x3a2a08, emissive: 0xffa020, emissiveIntensity: 0 });
    const led = new T.Mesh(new T.BoxGeometry(16, 10, 6), ledMat); led.position.set(-60, 30, 11); ard.add(led);
    const ardTex = tex(256, 64);
    const ardLbl = new T.Mesh(new T.PlaneGeometry(120, 30), new T.MeshBasicMaterial({ map: ardTex, transparent: true })); ardLbl.position.set(40, -60, 8.6); ard.add(ardLbl);
    hot(ard, "arduino · click to change the blink", () => nextMode());

    const meter = put(new T.Group(), 380, 1600, TOP, tall);
    const mBody = new T.Group(); mBody.rotation.x = -0.28; meter.add(mBody);
    const mb = rbox(250, 400, 70, 24, std(0xe9b824, 0.55)); mb.rotation.x = Math.PI / 2; mb.position.set(0, 35, 200); mBody.add(mb);
    const mFace = front(210, 360, std(0x2d2f33, 0.6)); mFace.position.set(0, -36, 200); mBody.add(mFace);
    let volts = "0.00";
    const lcdTex = tex(256, 120, (g, w, h) => {
      g.fillStyle = "#b9c4a6"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#20281a"; g.font = "700 76px ui-monospace, monospace"; g.textAlign = "right"; g.fillText(volts, w - 16, 84);
      g.font = "20px system-ui"; g.fillText("V DC", w - 16, 112); g.textAlign = "left";
    });
    const lcd = front(180, 84, glow(lcdTex)); lcd.position.set(0, -37, 310); mBody.add(lcd);
    const dial = shadow(new T.Mesh(new T.CylinderGeometry(58, 60, 20, 32), std(0x3d4046, 0.4, 0.3))); dial.position.set(0, -45, 180); mBody.add(dial);
    const ptr = new T.Mesh(new T.BoxGeometry(10, 6, 52), std(0xe9b824, 0.5)); ptr.position.set(0, -56, 204); mBody.add(ptr);
    [[-45, 0xc0352b], [45, 0x111111]].forEach(([x, c]) => { const j = new T.Mesh(new T.CylinderGeometry(15, 15, 14, 20), std(c, 0.4)); j.position.set(x, -42, 70); mBody.add(j); });
    hot(meter, "multimeter · reading pin 13", () => fx("beep"));
    scene.add(tube([[335, 1640, 60], [360, 1700, TOP + 6], [500, 1620, TOP + 6], [600, 1480, TOP + 6], [640, 1380, 20]], 6, std(0xc0352b, 0.45)));
    scene.add(tube([[425, 1640, 60], [450, 1690, TOP + 6], [560, 1600, TOP + 6], [660, 1500, TOP + 6], [690, 1380, 20]], 6, std(0x161616, 0.5)));

    const Sd = [[1, 150], [0, 150]], Od = [[1, 450], [0, 150]];
    const MODES = [
      ["blink", [[1, 500], [0, 500]]],
      ["fast", [[1, 90], [0, 90]]],
      ["heartbeat", [[1, 90], [0, 130], [1, 90], [0, 700]]],
      ["SOS", [...Sd, ...Sd, ...Sd, ...Od, ...Od, ...Od, ...Sd, ...Sd, ...Sd, [0, 900]]],
    ];
    let mi = 0, step = 0, ledT = 0;
    const paintMode = () => redraw(ardTex, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = hand(44); g.fillText(MODES[mi][0], 8, 46); });
    function ledStep() {
      const seq = MODES[mi][1];
      const [on, ms] = seq[step % seq.length];
      step++;
      ledMat.emissiveIntensity = on ? 3 : 0;
      volts = on ? (4.96 + Math.random() * 0.03).toFixed(2) : (Math.random() * 0.01).toFixed(2);
      redraw(lcdTex);
      ledT = setTimeout(() => (active && !document.hidden ? ledStep() : (ledT = setTimeout(ledStep, 400))), ms);
    }
    function nextMode() { mi = (mi + 1) % MODES.length; step = 0; paintMode(); fx("click"); clearTimeout(ledT); ledStep(); }
    paintMode();
    ledStep();

    /* ================================================================ */
    /* glue gun, drone, satellite: they open the notebook                */
    /* ================================================================ */
    function opener(g, id, tip) { g.userData.home = g.position.clone(); g.userData.id = id; hot(g, tip, () => launch(g), { opener: g }); }
    const glue = put(new T.Group(), 2260, 1600, TOP);
    {
      const red = std(0xd84a3a, 0.4, 0.05);
      const barrel = shadow(new T.Mesh(new T.CylinderGeometry(42, 42, 250, 28), red)); barrel.rotation.z = Math.PI / 2; barrel.position.z = 48; glue.add(barrel);
      const noz = shadow(new T.Mesh(new T.ConeGeometry(30, 80, 24), std(0x9ea3a8, 0.3, 0.9))); noz.rotation.z = Math.PI / 2; noz.position.set(-165, 0, 48); glue.add(noz);
      const hdl = rbox(70, 170, 56, 16, std(0xb63a2c, 0.5)); hdl.position.set(50, -90, 18); hdl.rotation.z = -0.15; glue.add(hdl);
      const stick = shadow(new T.Mesh(new T.CylinderGeometry(15, 15, 140, 20), std(0xf6f2df, 0.2, 0, { transparent: true, opacity: 0.85 }))); stick.rotation.z = Math.PI / 2; stick.position.set(180, 0, 48); glue.add(stick);
      const trig = rbox(30, 60, 40, 8, std(0x2a2a2a, 0.5)); trig.position.set(10, -58, 22); glue.add(trig);
    }
    glue.rotation.z = 0.25;
    opener(glue, "001", "hot glue gun · <b>entry 001</b>");

    const drone = put(new T.Group(), 2720, 1700, TOP);
    const props = [];
    {
      const wht = std(0xf1f1ee, 0.45);
      drone.add(rbox(110, 140, 44, 16, wht));
      const lens = new T.Mesh(new T.CylinderGeometry(10, 10, 8, 20), std(0x111111, 0.2, 0.5)); lens.position.set(0, -71, 24); drone.add(lens);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const x = sx * 100, y = sy * 100;
        const arm = shadow(new T.Mesh(new T.BoxGeometry(150, 20, 14), wht)); arm.position.set(x / 2, y / 2, 22); arm.rotation.z = Math.atan2(y, x); drone.add(arm);
        const guard = shadow(new T.Mesh(new T.TorusGeometry(62, 5, 8, 40), std(0xdedede, 0.4))); guard.position.set(x, y, 30); drone.add(guard);
        const motor = new T.Mesh(new T.CylinderGeometry(14, 14, 24, 16), std(0x333333, 0.4, 0.6)); motor.rotation.x = Math.PI / 2; motor.position.set(x, y, 30); drone.add(motor);
        const prop = new T.Group(); prop.position.set(x, y, 44);
        prop.add(shadow(new T.Mesh(new T.BoxGeometry(110, 12, 3), std(0x9a9a9a, 0.5))));
        drone.add(prop); props.push(prop);
      });
    }
    drone.rotation.z = -0.2;
    opener(drone, "008", "the tello drone · <b>entry 008</b>");

    const sat = put(new T.Group(), 1190, 1860, TOP);
    {
      const panelTex = tex(128, 192, (g, w, h) => {
        g.fillStyle = "#1f3f86"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "#8fa9e6"; g.lineWidth = 2;
        for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      });
      const bodyS = rbox(100, 100, 100, 6, std(0xd8b04a, 0.3, 0.8)); bodyS.position.z = 10; sat.add(bodyS);
      const edge = std(0x333333, 0.5);
      [-1, 1].forEach((s) => {
        const p = shadow(new T.Mesh(new T.BoxGeometry(100, 130, 4), [edge, edge, edge, edge, std(0xffffff, 0.3, 0.4, { map: panelTex }), edge]));
        p.position.set(s * 110, 0, 40); p.rotation.y = s * 0.25; sat.add(p);
      });
      const ant = new T.Mesh(new T.CylinderGeometry(2, 2, 120, 8), std(0xcccccc, 0.3, 0.9)); ant.rotation.x = Math.PI / 2; ant.position.set(20, 0, 170); sat.add(ant);
    }
    sat.rotation.z = 0.3;
    opener(sat, "009", "the tiny satellite · <b>entry 009</b>");
    let launching = null;
    function launch(g) {
      if (launching) return;
      launching = { g, t0: performance.now() };
      fx(g === drone ? "whir" : "click");
      setTimeout(() => openAt(g.userData.id), g === drone ? 750 : 400);
    }

    /* ================================================================ */
    /* clutter: cables, earbuds, highlighter, eraser, papers             */
    /* ================================================================ */
    const cableMat = std(0x1a1a1a, 0.6);
    scene.add(tube([[1060, 400, TOP + 6], [1150, 520, TOP + 6], [1400, 500, TOP + 6], [1700, 470, TOP + 6], [2100, 520, TOP + 6], [2600, 560, TOP + 6], [3010, 600, 80]], 7, cableMat, 80));
    scene.add(tube([[2320, 400, TOP + 6], [2400, 470, TOP + 6], [2700, 450, TOP + 6], [3000, 560, 120]], 7, cableMat, 50));
    scene.add(tube([[1650, 600, TOP + 6], [1700, 560, TOP + 6], [1900, 600, TOP + 6], [2010, 560, TOP + 6]], 5, cableMat, 30));
    const ear = std(0xf4f4f2, 0.3);
    [[2500, 980], [2550, 1010]].forEach(([x, y], i) => {
      put(shadow(new T.Mesh(new T.SphereGeometry(20, 20, 14), ear)), x, y, TOP + 18);
      scene.add(rod([x, y, TOP + 12], [x + (i ? 10 : -12), y + 60, TOP + 8], 7, ear));
    });
    const hl = put(new T.Group(), 2880, 1900, TOP + 20);
    { const b = shadow(new T.Mesh(new T.CylinderGeometry(20, 20, 200, 20), std(0xff8a1f, 0.4))); b.rotation.z = Math.PI / 2; hl.add(b);
      const cp = shadow(new T.Mesh(new T.CylinderGeometry(22, 22, 60, 20), std(0xffd34d, 0.4))); cp.rotation.z = Math.PI / 2; cp.position.x = 120; hl.add(cp); }
    hl.rotation.z = 0.4;
    put(rbox(64, 40, 18, 6, std(0x7fc8b4, 0.7)), 1010, 1080, TOP).rotation.z = 0.25;
    const paper = new T.Mesh(new T.PlaneGeometry(360, 250), std(0xf6f4ee, 0.9));
    paper.position.copy(V(2650, 260, TOP + 0.8)); paper.rotation.z = -0.1; paper.receiveShadow = true; scene.add(paper);

    /* ================================================================ */
    /* night mode                                                        */
    /* ================================================================ */
    const NKEY = "nb-night";
    let night = false;
    try { night = localStorage.getItem(NKEY) === "1"; } catch (_) {}
    // at night the screens and the printer light the room; moonlight through the window
    const monGlow = new T.PointLight(0x9fc0ff, 0, 1900, 0);
    monGlow.position.copy(V(1700, 760, 620)); scene.add(monGlow);
    function setNight(on) {
      root.classList.toggle("night", on);
      monGlow.intensity = on ? 0.08 : 0; // just a faint spill from the screens
      printer.userData.lamp.intensity = 1.4; // the chamber light stays inside the printer
      winLight.color.set(on ? 0x6f86c8 : 0xdfeaff);
      hemi.intensity = on ? 0.12 : 1.1;
      key.intensity = on ? 0.05 : 2.2;
      scene.environmentIntensity = on ? 0.08 : 0.55;
      spot.intensity = on ? 5.5 : 0.9;
      bulbMat.emissiveIntensity = on ? 4 : 0.4;
      scene.background.set(on ? 0x0b0a09 : 0x24211d);
      winLight.intensity = on ? 0.05 : 0.5; // barely any moonlight
      skyNight = on; paintSky();
      retip(lamp, on ? "desk lamp · click for day mode" : "desk lamp · click for night mode");
      try { localStorage.setItem(NKEY, on ? "1" : "0"); } catch (_) {}
      dirty = true;
    }
    function toggleNight() { night = !night; setNight(night); fx("click"); }
    setNight(night);

    /* ================================================================ */
    /* memory board: a green soft board on the left, polaroids pinned   */
    /* to it. Blurred from the desk; sharp once you walk up to it.       */
    /* Photos + captions come from img/memories/memories.json.           */
    /* ================================================================ */
    const BX = 50, BY0 = 420, BY1 = 2180, BZ0 = 60, BZ1 = 1500; // board face plane x = BX, hung on the left wall
    const boardMid = V(BX, (BY0 + BY1) / 2, (BZ0 + BZ1) / 2);
    const boardGrp = new T.Group();
    tall.add(boardGrp);
    {
      const felt = tex(1024, 640, (g, w, h) => {
        g.fillStyle = "#3f6e4c"; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 26000; i++) {
          const l = Math.random();
          g.fillStyle = l < 0.5 ? `rgba(20,45,28,${Math.random() * 0.25})` : `rgba(140,190,150,${Math.random() * 0.12})`;
          g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
        }
        for (let i = 0; i < 260; i++) { // old pin holes
          g.fillStyle = "rgba(10,25,15,.55)"; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1.3, 0, 7); g.fill();
        }
      });
      felt.wrapS = felt.wrapT = T.RepeatWrapping;
      const L = BY1 - BY0, H = BZ1 - BZ0;
      const back = box(40, L, H, std(0x8a8678, 0.8));
      back.position.copy(V(BX - 20 - 20, (BY0 + BY1) / 2, BZ0)); boardGrp.add(back);
      const face = new T.Mesh(new T.PlaneGeometry(L, H), std(0xffffff, 0.95, 0, { map: felt }));
      face.rotation.set(Math.PI / 2, Math.PI / 2, 0);
      face.position.copy(V(BX, (BY0 + BY1) / 2, (BZ0 + BZ1) / 2));
      face.receiveShadow = true; boardGrp.add(face);
      const alu = std(0xc9ccd0, 0.35, 0.8);
      [[BY0, BY0 + 28], [BY1 - 28, BY1]].forEach(([a, b]) => { const r = box(34, b - a, H, alu); r.position.copy(V(BX - 14, (a + b) / 2, BZ0)); boardGrp.add(r); });
      [BZ1 - 28, BZ0].forEach((z) => { const r = box(34, L, 28, alu); r.position.copy(V(BX - 14, (BY0 + BY1) / 2, z)); boardGrp.add(r); });
      hot(boardGrp, "memory board · click to look closer", () => zoomTo("board"), { board: true });
    }
    // a frame on the board face: x' = towards the back wall, y' = up, z' = out of the board
    const boardFace = new T.Group();
    boardFace.matrixAutoUpdate = true;
    boardFace.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1), new T.Vector3(1, 0, 0)));
    boardFace.position.copy(V(BX, (BY0 + BY1) / 2, 0));
    boardGrp.add(boardFace);
    // polaroid layout (u: -910 front .. 910 back, v: height above the desk)
    const SLOTS = [ // the first eight spread over the whole board; more fill the gaps
      [-640, 1170, -0.06], [-80, 1200, 0.04], [520, 1160, -0.03], [-370, 860, 0.05], [230, 880, -0.04], [-660, 540, 0.03], [-80, 520, -0.05], [560, 600, 0.04],
      [-360, 1190, 0.03], [230, 1215, -0.02], [770, 1170, 0.05], [-650, 860, -0.03], [510, 900, 0.03], [-380, 530, 0.04], [230, 550, -0.03],
    ];
    const PW = 240, PH = 290, PK = 2.5; // polaroid in desk units, canvas px per unit
    const PHOTO = { x: 13, y: 13, w: 214, h: 214 }; // photo window on the card
    const PINS = [0xd23b2f, 0x2f62c9, 0xe7c11b, 0x2e9a5a, 0xf3f3f3, 0xd96aa7];
    const polaroids = [];
    function placeholderPhoto(g, x, y, w, h, i) {
      const hues = [[30, 200], [200, 25], [12, 260], [45, 170], [340, 210], [190, 40]][i % 6];
      const sky = g.createLinearGradient(0, y, 0, y + h);
      sky.addColorStop(0, `hsl(${hues[1]},45%,62%)`); sky.addColorStop(1, `hsl(${hues[0]},70%,72%)`);
      g.fillStyle = sky; g.fillRect(x, y, w, h);
      g.fillStyle = `hsla(${hues[0]},90%,85%,.9)`; g.beginPath(); g.arc(x + w * (0.3 + (i % 3) * 0.2), y + h * 0.55, w * 0.09, 0, 7); g.fill();
      g.fillStyle = `hsl(${hues[1]},25%,${28 + (i % 3) * 6}%)`;
      g.beginPath(); g.moveTo(x, y + h);
      for (let k = 0; k <= 8; k++) g.lineTo(x + (w * k) / 8, y + h * (0.62 + 0.12 * Math.sin(k * 1.7 + i)));
      g.lineTo(x + w, y + h); g.fill();
    }
    function vintage(g, x, y, w, h) {
      g.save();
      g.globalCompositeOperation = "multiply"; g.fillStyle = "rgba(255,226,180,.35)"; g.fillRect(x, y, w, h);
      g.globalCompositeOperation = "screen"; g.fillStyle = "rgba(60,40,30,.18)"; g.fillRect(x, y, w, h); // faded blacks
      g.globalCompositeOperation = "source-over";
      const vg = g.createRadialGradient(x + w / 2, y + h / 2, w * 0.3, x + w / 2, y + h / 2, w * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(40,20,0,.38)");
      g.fillStyle = vg; g.fillRect(x, y, w, h);
      for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "0,0,0"},${Math.random() * 0.08})`; g.fillRect(x + Math.random() * w, y + Math.random() * h, 1.5, 1.5); }
      g.restore();
    }
    function drawCard(g, w, h, m, i) {
      const k = PK;
      // aged white border
      const pg = g.createLinearGradient(0, 0, w, h);
      pg.addColorStop(0, "#f5f0e1"); pg.addColorStop(1, "#ebe2c9");
      g.fillStyle = pg; g.fillRect(0, 0, w, h);
      for (let j = 0; j < 500; j++) { g.fillStyle = `rgba(120,90,40,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } // age spots
      const px = PHOTO.x * k, py = PHOTO.y * k, pw = PHOTO.w * k, ph = PHOTO.h * k;
      g.fillStyle = "#222"; g.fillRect(px, py, pw, ph);
      if (m.img) {
        const s = Math.max(pw / m.img.naturalWidth, ph / m.img.naturalHeight);
        const sw = pw / s, sh = ph / s;
        const fx0 = m.focus ? m.focus[0] : 0.5, fy0 = m.focus ? m.focus[1] : 0.5;
        g.drawImage(m.img, (m.img.naturalWidth - sw) * fx0, (m.img.naturalHeight - sh) * fy0, sw, sh, px, py, pw, ph);
      } else placeholderPhoto(g, px, py, pw, ph, i);
      vintage(g, px, py, pw, ph);
      g.strokeStyle = "rgba(0,0,0,.25)"; g.lineWidth = 2; g.strokeRect(px, py, pw, ph);
      // biro on the bottom border
      g.save();
      g.translate(px + 6, py + ph + 10);
      g.rotate(-0.014);
      g.fillStyle = "#1f2c58"; g.textBaseline = "top";
      g.font = hand(46); g.fillText(m.date || "", 0, 0);
      g.font = hand(40);
      const note = m.note || "";
      // wrap the note over at most two lines
      const words = note.split(/\s+/); let line = "", lines = [];
      words.forEach((wd) => { const t = line ? line + " " + wd : wd; if (g.measureText(t).width > pw - 8 && line) { lines.push(line); line = wd; } else line = t; });
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((l, j) => g.fillText(l, 10, 48 + j * 40));
      g.restore();
    }
    function makePolaroid(i, m) {
      const [u, v, rot] = SLOTS[i];
      const grp = new T.Group();
      grp.position.set(u, v, 2);
      grp.rotation.z = rot;
      boardFace.add(grp);
      const sharp = tex(Math.round(PW * PK), Math.round(PH * PK), (g, w, h) => drawCard(g, w, h, m, i));
      const card = new T.Mesh(new T.BoxGeometry(PW, PH, 1.5), [std(0xe9e2cc, 0.9), std(0xe9e2cc, 0.9), std(0xe9e2cc, 0.9), std(0xe9e2cc, 0.9), std(0xffffff, 0.85, 0, { map: sharp }), std(0xd8d0b8, 0.9)]);
      card.castShadow = true;
      grp.add(card);
      // the blurred copy over the photo + caption, faded out as you walk up
      const bw = PHOTO.w, bh = PH - PHOTO.y - 6;
      const blurTex = tex(24, 30);
      blurTex.userData.draw = (g) => {
        const src = sharp.image, k = PK;
        const small = document.createElement("canvas"); small.width = 9; small.height = 11;
        small.getContext("2d").drawImage(src, PHOTO.x * k, PHOTO.y * k, bw * k, bh * k, 0, 0, 9, 11);
        g.imageSmoothingEnabled = true; g.drawImage(small, 0, 0, 24, 30);
      };
      redraw(blurTex);
      const blurMat = new T.MeshStandardMaterial({ map: blurTex, roughness: 0.9, transparent: true, opacity: 1 });
      const blur = new T.Mesh(new T.PlaneGeometry(bw, bh), blurMat);
      blur.position.set(0, PH / 2 - PHOTO.y - bh / 2, 1.2);
      grp.add(blur);
      // thumb pin
      const pinMat = std(PINS[i % PINS.length], 0.3, 0.1);
      const head = new T.Mesh(new T.CylinderGeometry(12, 14, 14, 20), pinMat); head.rotation.x = Math.PI / 2; head.position.set(0, PH / 2 - 22, 16); head.castShadow = true;
      const neck = new T.Mesh(new T.CylinderGeometry(6, 8, 10, 14), pinMat); neck.rotation.x = Math.PI / 2; neck.position.set(0, PH / 2 - 22, 5);
      grp.add(head, neck);
      const p = { grp, m, sharp, blurTex, blurMat, i };
      grp.userData.pol = p;
      hot(grp, "memory board · click to look closer", () => clickPolaroid(p), { board: true });
      polaroids.push(p);
      if (m.photo) {
        const img = new Image();
        img.onload = () => { m.img = img; redraw(sharp); redraw(blurTex); };
        img.src = m.photo;
      }
      return p;
    }
    function polTip(p) {
      if (zoom.mode === "board") return [p.m.date, p.m.note].filter(Boolean).join(" · ") || "click to look closer";
      if (zoom.mode === "photo" && zoom.photo === p) return "click to step back";
      return "memory board · click to look closer";
    }
    const retipPolaroids = () => polaroids.forEach((p) => retip(p.grp, polTip(p)));
    function clickPolaroid(p) {
      if (zoom.to && zoom.mode === "photo" && zoom.photo === p) zoomTo("board");
      else if (zoom.to && (zoom.mode === "board" || zoom.mode === "photo")) { zoom.photo = p; zoomTo("photo"); }
      else zoomTo("board");
    }
    const PLACEHOLDER = (i) => ({ date: "__ . __ . ____", note: "a memory goes here" });
    fetch(new URL("../img/memories/memories.json", BASE).href)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((list) => {
        const base = new URL("../img/memories/", BASE).href;
        list = (Array.isArray(list) ? list : []).slice(0, SLOTS.length).map((m) => ({ ...m, photo: m.photo ? new URL(m.photo, base).href : "" }));
        const n = Math.max(list.length, 8);
        for (let i = 0; i < Math.min(n, SLOTS.length); i++) makePolaroid(i, list[i] || PLACEHOLDER(i));
        dirty = true;
      });

    /* ================================================================ */
    /* close-ups: the keyboard + left monitor, the memory board, one     */
    /* polaroid. The camera leaves the CSS camera and glides to a pose.  */
    /* ================================================================ */
    const zoom = { v: 0, to: 0, mode: null, photo: null, from: null, mix: 1, cache: {} };
    const typing = () => zoom.to && zoom.mode === "kb";
    const onBoard = () => zoom.to && (zoom.mode === "board" || zoom.mode === "photo");
    const fcam = new T.PerspectiveCamera();
    function view(mode) {
      if (mode === "kb") return {
        // the left monitor and the whole keyboard, looking down onto the keys
        pts: [[480, 360, 1170], [470, 360, 990], [1650, 360, 990], [470, 360, 300], [1196, 590, 30], [2200, 590, 30], [1196, 890, 0], [2200, 890, 0]].map((q) => V(...q)),
        dir: new T.Vector3(0, -Math.cos(1.0), Math.sin(1.0)), tgt: V(1335, 625, 470), clip: false, mx: 0.94,
      };
      if (mode === "board") return {
        pts: [V(BX, BY0, 300), V(BX, BY1, 300), V(BX, BY0, BZ1), V(BX, BY1, BZ1)],
        dir: new T.Vector3(1, 0, 0), tgt: boardMid.clone(), clip: true, mx: 0.97,
      };
      // one polaroid, face on
      const g = zoom.photo.grp, pts = [[-PW / 2, -PH / 2], [PW / 2, -PH / 2], [-PW / 2, PH / 2], [PW / 2, PH / 2 + 10]].map(([x, y]) => g.localToWorld(new T.Vector3(x, y, 0)));
      return { pts, dir: new T.Vector3(1, 0, 0), tgt: g.localToWorld(new T.Vector3(0, 0, 0)), clip: true, mx: 0.7, roll: g.rotation.z };
    }
    function solvePose(mode) {
      const ck = mode + (mode === "photo" ? zoom.photo.i : "") + "@" + vw + "x" + vh;
      if (zoom.cache[ck]) return zoom.cache[ck];
      const vwd = view(mode);
      fcam.projectionMatrix.copy(baseProj);
      fcam.projectionMatrixInverse.copy(baseProj).invert();
      const up = new T.Vector3(0, 0, 1);
      if (vwd.roll) up.applyAxisAngle(vwd.dir, -vwd.roll); // straighten the card on screen
      fcam.up.copy(up);
      const dir = vwd.dir.clone().normalize(), tgt = vwd.tgt.clone();
      const ymax = (1 - 2 * (0.1 * vh + 14) / vh) * vwd.mx; // clear of the letterbox bars
      const xmax = vwd.mx;
      const pose = (d) => { fcam.position.copy(tgt).addScaledVector(dir, d); fcam.lookAt(tgt); fcam.updateMatrixWorld(true); };
      const box = () => {
        let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
        vwd.pts.forEach((q) => { const n = q.clone().project(fcam); x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); });
        return { x0, x1, y0, y1 };
      };
      for (let pass = 0; pass < 3; pass++) {
        let lo = 100, hi = 9000;
        for (let i = 0; i < 26; i++) {
          const d = (lo + hi) / 2; pose(d);
          const b = box();
          if (b.x0 < -xmax || b.x1 > xmax || b.y0 < -ymax || b.y1 > ymax) lo = d; else hi = d;
        }
        pose(hi);
        const b = box(), depth = tgt.clone().project(fcam).z;
        const c = new T.Vector3((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, depth).unproject(fcam);
        const o = new T.Vector3(0, 0, depth).unproject(fcam);
        tgt.add(c.sub(o));
      }
      return (zoom.cache[ck] = { p: fcam.position.clone(), q: fcam.quaternion.clone(), clip: vwd.clip ? 1 : 0 });
    }
    // where the close-up camera is right now (mid-glide between two close-ups too)
    function focusNow() {
      const to = solvePose(zoom.mode);
      if (!zoom.from || zoom.mix >= 1) return to;
      const e = zoom.mix * zoom.mix * (3 - 2 * zoom.mix);
      return { p: zoom.from.p.clone().lerp(to.p, e), q: zoom.from.q.clone().slerp(to.q, e), clip: zoom.from.clip + (to.clip - zoom.from.clip) * e };
    }
    const _p = new T.Vector3(), _q = new T.Quaternion(), _s = new T.Vector3(), _c = new T.Vector3();
    const baseProj = new T.Matrix4();
    let clipNear = 0; // world distance to clip in front of the board, so nothing on the desk blocks it
    function blendCamera() {
      clipNear = 0;
      if (zoom.v <= 0.0005 || !zoom.mode) return;
      const F = focusNow();
      camera.matrixWorld.decompose(_p, _q, _s);
      const e = zoom.v * zoom.v * (3 - 2 * zoom.v);
      _p.lerp(F.p, e);
      _q.slerp(F.q, e);
      camera.matrixWorld.compose(_p, _q, _s);
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      if (F.clip > 0) {
        // near plane just in front of the board: the organiser, lamp, shelf posts... drop away
        const d = -_c.copy(boardMid).applyMatrix4(camera.matrixWorldInverse).z; // view units
        const near = d - 50 / _s.x - (1 - e * F.clip) * 4000 / _s.x;
        if (near > 20) clipNear = near;
      }
    }

    // while the camera moves the HTML notebook can't follow, so a 3D one stands in
    const proxyTex = tex(570, 806, (g, w, h) => {
      g.fillStyle = "#1f2f4f"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,.05)"; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      g.fillStyle = "#14203a"; g.fillRect(0, 0, 26, h);
      g.save(); g.translate(w / 2, 150); g.rotate(-0.012);
      g.fillStyle = "#f4efe2"; g.fillRect(-140, -60, 280, 130);
      g.fillStyle = "#2b4a8b"; g.font = hand(30); g.fillText("Karan's", -116, -20);
      g.fillStyle = "#1c1c1c"; g.font = hand(44); g.fillText("Lab Notebook", -116, 26);
      g.restore();
      g.strokeStyle = "#c0392b"; g.lineWidth = 3; g.strokeRect(w / 2 - 70, 345, 140, 30);
      g.fillStyle = "#c0392b"; g.font = "700 18px system-ui, sans-serif"; g.fillText("DO NOT LOSE", w / 2 - 58, 367);
      g.fillStyle = "#f6f2e6"; g.fillRect(80, 470, 110, 120);
      g.fillStyle = "#e9b53b"; g.beginPath(); g.arc(w - 150, 520, 58, 0, 7); g.fill();
      g.fillStyle = "#1c1c1c"; g.font = "800 15px system-ui, sans-serif"; g.fillText("HOT GLUE", w - 186, 516); g.fillText("INSIDE", w - 176, 536);
    });
    const proxy = new T.Group();
    proxy.visible = false;
    scene.add(proxy);
    function placeProxy() {
      const cs = getComputedStyle(root);
      const ds = (parseFloat(cs.getPropertyValue("--pw")) || 570) / 570, bh = (parseFloat(cs.getPropertyValue("--ph")) || 806) / ds;
      const top = 24 / ds, th = Math.max(8, top - TOP);
      proxy.clear();
      const side = std(0x1a2846, 0.6), pages = std(0xe9e2cf, 0.9);
      const m = new T.Mesh(new T.BoxGeometry(570, bh, th), [pages, side, side, side, std(0xffffff, 0.7, 0, { map: proxyTex }), side]);
      m.castShadow = m.receiveShadow = true;
      m.position.copy(V(1415 + 285, 900 + bh / 2, TOP + th / 2));
      proxy.add(m);
    }

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "desk-back";
    backBtn.innerHTML = "&larr; back to the desk <kbd>esc</kbd>";
    stage.appendChild(backBtn);
    let afterZoom = null;
    const BACK = { kb: "back to the desk", board: "back to the desk", photo: "back to the board" };
    function setBack() { backBtn.innerHTML = `&larr; ${BACK[zoom.mode] || BACK.kb} <kbd>esc</kbd>`; }
    function zoomTo(mode) {
      if (pParam > 0.005) return;
      if (zoom.to && zoom.mode === mode && mode !== "photo") { if (mode === "kb") input.focus({ preventScroll: true }); return; }
      if (zoom.to || zoom.v > 0) { zoom.from = focusNow(); zoom.mix = 0; } // glide on from where we are
      else { zoom.from = null; zoom.mix = 1; }
      if (!zoom.to) {
        placeProxy(); proxy.visible = true; bookShadow.visible = false;
        stage.classList.add("desk-zoom");
      }
      zoom.to = 1;
      zoom.mode = mode;
      stage.classList.toggle("desk-board", mode !== "kb");
      tipEl.classList.remove("on"); hoverObj = null;
      setBack(); retipPolaroids();
      fx("whir");
      if (mode === "kb") input.focus({ preventScroll: true }); else input.blur();
      wake();
    }
    const zoomIn = () => zoomTo("kb");
    function zoomOut(then) {
      if (!zoom.to) return false;
      if (zoom.mix < 1) { zoom.from = null; zoom.mix = 1; }
      zoom.to = 0;
      afterZoom = then || null;
      input.blur();
      stage.classList.remove("desk-typing");
      wake();
      return true;
    }
    // Esc / back: a polaroid steps back to the board, everything else back to the desk
    const stepBack = () => (zoom.mode === "photo" ? zoomTo("board") : zoomOut());
    zoomExit = zoomOut;
    let focusLvl = 0; // 1 = polaroids sharp
    function stepZoom(dt) {
      const step = Math.max(dt, 1 / 60);
      const want = onBoard() ? 1 : 0;
      if (focusLvl !== want) {
        focusLvl = clamp(focusLvl + (want ? 1 : -1) * step / 0.8, 0, 1);
        const o = 1 - focusLvl * focusLvl;
        polaroids.forEach((p) => { p.blurMat.opacity = o; p.blurMat.visible = o > 0.01; });
        dirty = true;
      }
      if (zoom.mix < 1) { zoom.mix = Math.min(1, zoom.mix + step / 0.8); syncCamera(); }
      if (zoom.v === zoom.to) return;
      zoom.v = clamp(zoom.v + (zoom.to ? 1 : -1) * step / 0.9, 0, 1); // 0.9 s, eased in blendCamera
      if (zoom.v === 0) {
        proxy.visible = false; bookShadow.visible = true;
        zoom.mode = null; zoom.from = null;
        stage.classList.remove("desk-zoom", "desk-board");
        retipPolaroids();
        if (afterZoom) { const f = afterZoom; afterZoom = null; setTimeout(f, 30); }
      }
      if (zoom.v === 1 && zoom.mode === "kb") stage.classList.add("desk-typing");
      syncCamera();
    }
    backBtn.addEventListener("click", (e) => { e.stopPropagation(); stepBack(); });
    addEventListener("keydown", (e) => {
      if (!zoom.to) return;
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); stepBack(); return; }
      if (typing()) { // at the keyboard every key goes to the terminal
        if (e.target !== input && !e.metaKey && !e.ctrlKey) input.focus({ preventScroll: true });
        if (e.target !== input) e.stopImmediatePropagation();
        return;
      }
      // at the board: arrows walk along the polaroids, nothing turns pages
      e.stopImmediatePropagation();
      if (/^Arrow(Left|Right)$/.test(e.key) && polaroids.length) {
        e.preventDefault();
        const i = zoom.mode === "photo" ? polaroids.indexOf(zoom.photo) : -1;
        zoom.photo = polaroids[(i + (e.key === "ArrowRight" ? 1 : polaroids.length - 1 + (i < 0 ? 1 : 0))) % polaroids.length];
        zoomTo("photo");
      }
    }, true);
    ["wheel", "touchstart", "touchmove"].forEach((t) => addEventListener(t, (e) => { if (zoom.to && !e.target.closest(".desk-back")) e.stopImmediatePropagation(); }, { capture: true, passive: true }));

    /* ================================================================ */
    /* camera: copy the CSS camera                                       */
    /* ================================================================ */
    const P = 1500;
    let vw = 0, vh = 0;
    syncCamera = () => {
      if (innerWidth !== vw || innerHeight !== vh) {
        vw = innerWidth; vh = innerHeight;
        renderer.setSize(vw, vh, false);
        placeBookShadow();
        zoom.cache = {};
        if (proxy.visible) placeProxy();
      }
      const ox = vw * 0.5, oy = vh * 0.4, n = 20, f = 12000;
      camera.projectionMatrix.makePerspective(-ox * n / P, (vw - ox) * n / P, oy * n / P, -(vh - oy) * n / P, n, f);
      baseProj.copy(camera.projectionMatrix);
      const cs = getComputedStyle(root);
      const pw = parseFloat(cs.getPropertyValue("--pw")) || 570, ph = parseFloat(cs.getPropertyValue("--ph")) || 806;
      const ds = pw / 570;
      const M = new DOMMatrix(camEl.style.transform || "none");
      const Tc = new DOMMatrix().translate(pw / 2, ph / 2).multiply(M).translate(-pw / 2, -ph / 2);
      // model (x, Y, z) -> CSS cam space: X = ds(x - 1415), Y = ds(-Y - 900), Z = ds z - 24
      const D2C = new DOMMatrix([ds, 0, 0, 0, 0, -ds, 0, 0, 0, 0, ds, 0, -1415 * ds, -900 * ds, -24, 1]);
      const full = new DOMMatrix().scale(1, -1, 1).multiply(Tc).multiply(D2C); // -> stage space, y up
      const camWorld = full.inverse().multiply(new DOMMatrix().translate(ox, -oy, P));
      camera.matrixWorld.fromArray(camWorld.toFloat64Array());
      camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      blendCamera();
      const nn = clipNear || n;
      if (clipNear) camera.projectionMatrix.makePerspective(-ox * nn / P, (vw - ox) * nn / P, oy * nn / P, -(vh - oy) * nn / P, nn, f);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      dirty = true;
    };
    tallVisible = (on) => { if (tall.visible !== on) { tall.visible = on; dirty = true; } };
    addEventListener("resize", () => { vw = 0; });

    const bubbleAt = V(700, 1260, 430);
    render = () => {
      if (!dirty) return;
      dirty = false;
      renderer.render(scene, camera);
      if (level <= 0) {
        const p = bubbleAt.clone().project(camera);
        refill.style.transform = `translate(${((p.x + 1) / 2 * vw).toFixed(0)}px, ${((1 - p.y) / 2 * vh).toFixed(0)}px)`;
      }
    };

    /* ================================================================ */
    /* pointer: hover labels, clicks, drags                              */
    /* ================================================================ */
    const ndc = new T.Vector2();
    let hoverObj = null, drag = null;
    const shown3 = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
    function pick(e) {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const h = raycaster.intersectObjects(hits.filter((m) => shown3(m) && (!onBoard() || m.userData.board)), false)[0];
      return h ? h.object : null;
    }
    const bookEl = document.querySelector(".book");
    const overBook = (e) => { const r = bookEl.getBoundingClientRect(); return e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom; };
    function setHover(o, e) {
      if (o !== hoverObj) {
        if (hoverObj && hoverObj.userData.drawer) hoverObj.userData.drawer.userData.out = false;
        hoverObj = o;
        if (o && o.userData.drawer) o.userData.drawer.userData.out = true;
        if (o) tipEl.innerHTML = o.userData.tip;
        tipEl.classList.toggle("on", !!o && !(typing() && o.userData.key));
        stage.style.cursor = o ? (o.userData.cube || o.userData.spool != null ? "grab" : "pointer") : "";
      }
      if (o && o.userData.tip !== tipEl.dataset.tip) { tipEl.innerHTML = tipEl.dataset.tip = o.userData.tip; } // retip while hovering (printer progress)
      if (o && o.userData.tip !== tipEl.dataset.tip) tipEl.innerHTML = tipEl.dataset.tip = o.userData.tip; // keep live labels current while hovering
      if (o && e) { tipEl.style.left = e.clientX + "px"; tipEl.style.top = e.clientY - 18 + "px"; }
    }
    stage.addEventListener("pointermove", (e) => {
      if (!active || !ready) return;
      if (drag) return onDrag(e);
      if (e.pointerType === "mouse") {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        mouse.position.copy(V(2410 + nx * 180, 730 + ny * 150, TOP + 5));
        mouse.rotation.z = -nx * 0.25;
        dirty = true;
      }
      setHover(e.pointerType === "mouse" && !overBook(e) ? pick(e) : null, e);
    });
    stage.addEventListener("pointerleave", () => setHover(null));
    stage.addEventListener("pointerdown", (e) => {
      if (!active || overBook(e)) return;
      const o = pick(e);
      if (!o) return;
      if (o.userData.cube) drag = { kind: "cube", x: e.clientX, y: e.clientY, rz: spin.rotation.z, rx: spin.rotation.x, moved: false };
      else if (o.userData.spool != null) { drag = { kind: "spool", i: o.userData.spool, y: e.clientY }; fx("zip"); }
      else return;
      stage.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });
    function onDrag(e) {
      if (drag.kind === "cube") {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        spin.rotation.z = drag.rz + dx * 0.012;
        spin.rotation.x = clamp(drag.rx + dy * 0.008, -0.6, 0.6);
      } else {
        const L = clamp((e.clientY - drag.y) * 3.2, 0, 700);
        pullLen[drag.i] = L;
        wireAt(drag.i, L);
        wheels[drag.i].rotation.x = -L * 0.02;
      }
      dirty = true;
    }
    let justDragged = false;
    const endDrag = () => {
      if (!drag) return;
      const d = drag; drag = null;
      found(d.kind === "cube" ? "rubik's cube" : "wire spools");
      if (d.kind === "cube") { if (d.moved) { justDragged = true; spin.rotation.x = 0; } else cubeClick(); }
      else justDragged = true;
      setTimeout(() => (justDragged = false), 0);
      dirty = true;
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("touchmove", (e) => { if (drag) { e.stopPropagation(); e.preventDefault(); } }, { passive: false });
    stage.addEventListener("click", (e) => {
      if (!active || justDragged || (!zoom.to && overBook(e))) return;
      const o = pick(e);
      if (o && o.userData.click) { e.stopPropagation(); o.userData.click(); }
      else if (zoom.to) {
        e.stopPropagation();
        if (o === null) stepBack();
        else if (typing()) input.focus({ preventScroll: true });
      }
    });

    /* ================================================================ */
    /* the loop: animations only while the desk is on show               */
    /* ================================================================ */
    let last = 0, raf = 0;
    // idle (nobody touching anything, nothing animating): ~20 fps is plenty and spares the visitor's battery
    let lastInput = performance.now(), lastDraw = 0;
    ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => addEventListener(t, () => { lastInput = performance.now(); }, { capture: true, passive: true }));
    // slow GPU: first drop to 1x pixels, then simpler shadows
    const frameTimes = [];
    let quality = 2;
    function degrade() {
      if (quality === 2 && renderer.getPixelRatio() > 1) { quality = 1; renderer.setPixelRatio(1); }
      else if (quality > 0) {
        quality = 0;
        renderer.shadowMap.type = T.PCFShadowMap;
        spot.castShadow = false;
        if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
        key.shadow.mapSize.set(1024, 1024);
      }
      dirty = true;
    }
    function loop(now) {
      raf = 0;
      if (!active || document.hidden) return;
      const busyNow = drag || printing || playing || launching || zoom.v !== zoom.to || binShake > 0 || now - lastInput < 4000;
      if (!busyNow && now - lastDraw < 50) { raf = requestAnimationFrame(loop); return; }
      if (busyNow && lastDraw && quality > 0) {
        frameTimes.push(now - lastDraw);
        if (frameTimes.length >= 90) { frameTimes.sort((a, b) => a - b); if (frameTimes[45] > 30) degrade(); frameTimes.length = 0; }
      }
      lastDraw = now;
      const dt = Math.min(0.1, (now - (last || now)) / 1000);
      last = now;
      stepIron(dt, now);
      stepCube(now);
      stepHippo(now);
      stepZoom(dt);
      stepKeys(dt);
      stepCorner(dt, now);
      stepBin(dt);
      stepSpeaker(now);
      if (launching) {
        const { g, t0 } = launching, t = (now - t0) / 1000, h = g.userData.home;
        const lift = g === drone ? Math.min(1, t / 0.7) * 160 : Math.sin(Math.min(1, t / 0.5) * Math.PI) * 60;
        g.position.set(h.x, h.y, h.z + lift);
        if (t > 1.6) { g.position.copy(h); launching = null; }
      }
      if ((hoverObj && hoverObj.userData.opener === drone) || (launching && launching.g === drone)) props.forEach((p, i) => (p.rotation.z += (i % 2 ? 1 : -1) * 0.9));
      drawers.concat(shelfBooks).forEach((d) => {
        const want = d.userData.home - (d.userData.out ? d.userData.pull || 70 : 0);
        if (Math.abs(d.position.y - want) > 0.5) d.position.y += (want - d.position.y) * 0.25;
      });
      for (let i = 0; i < 3; i++) {
        if ((!drag || drag.i !== i) && pullLen[i] > 0) {
          pullLen[i] = pullLen[i] < 6 ? 0 : pullLen[i] * 0.82;
          wireAt(i, pullLen[i]);
          wheels[i].rotation.x = -pullLen[i] * 0.02;
        }
      }
      if (now - lastPlot > 60) {
        lastPlot = now;
        if (shown < PTS.length) { shown = Math.min(PTS.length, shown + 3); redraw(plotTex); }
        else if (!holdT) { holdT = now; redraw(plotTex); }
        else if (now - holdT > 3500) { shown = 0; holdT = 0; }
      }
      towerLed.material.color.setHSL(0.55, 0.9, 0.35 + 0.25 * Math.sin(now / 500));
      dirty = true;
      render();
      raf = requestAnimationFrame(loop);
    }
    wake = () => { if (active && !raf) { last = 0; raf = requestAnimationFrame(loop); } };
    document.addEventListener("visibilitychange", wake);
    // the label fonts may land after the first draw
    if (document.fonts) document.fonts.ready.then(() => { redraw(labelTex); paintMode(); });
  }
})();
