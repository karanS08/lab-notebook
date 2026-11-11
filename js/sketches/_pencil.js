/* Shared helpers: everything is line art on a transparent canvas,
   with a subtle "boiling line" wobble. Renders only when on-screen and
   the tab is visible; slows to ~9 fps when nobody is interacting. */
import * as THREE from "../vendor/three-r169-9d8a0bf2.min.js";
export { THREE };

export const INK = 0x2b2b2b;
export const BLUE = 0x2a4d8f;
export const RED = 0xb4322b;

export function stage(el, { aspect = 1, fov = 35, dist = 9 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", el.dataset.label || "pencil sketch");
  el.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
  camera.position.set(0, 0, dist);

  const size = () => {
    const w = el.clientWidth || 300;
    renderer.setSize(w, Math.round(w / aspect), false);
    canvas.style.aspectRatio = String(aspect);
  };
  size();
  addEventListener("resize", size);

  let visible = true, last = 0, hot = 0, raf = 0, onFrame = () => {};
  const wobblers = [];
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
  io.observe(el);
  document.addEventListener("visibilitychange", kick);

  function frame(t) {
    raf = 0;
    if (!visible || document.hidden || !canvas.isConnected) return;
    const busy = t < hot;
    if (t - last > (busy ? 15 : 110)) {
      const dt = Math.min((t - last) / 1000, 0.1);
      last = t;
      onFrame(dt, t / 1000);
      wobblers.forEach((w) => w());
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }
  el.__kick = () => { visible = true; kick(); }; // the book calls this when a page comes back
  el.__dispose = () => { // and this when it throws a page away
    io.disconnect();
    removeEventListener("resize", size);
    renderer.dispose();
    renderer.forceContextLoss();
  };
  /* call on any input: run at full frame rate for a moment */
  function poke(ms = 1200) { hot = performance.now() + ms; kick(); }

  return {
    THREE, scene, camera, canvas, renderer, poke,
    set onFrame(fn) { onFrame = fn; },
    wobble(obj, amt = 0.012) { wobblers.push(makeWobble(obj, amt)); return obj; },
    start: kick,
  };
}

/* pencil outline of any geometry */
export function pencil(geo, color = INK, opacity = 0.85) {
  const edges = new THREE.EdgesGeometry(geo, 20);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.LineSegments(edges, mat);
}

/* a polyline from [[x,y,z],...] */
export function line(points, color = INK, opacity = 0.85) {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

/* jitter every vertex of every line under obj, a little, each tick */
function makeWobble(obj, amt) {
  const sets = [];
  obj.traverse((o) => {
    if (o.isLine || o.isLineSegments) {
      const pos = o.geometry.attributes.position;
      sets.push([pos, pos.array.slice()]);
    }
  });
  return () => {
    for (const [pos, base] of sets) {
      const a = pos.array;
      for (let i = 0; i < a.length; i++) a[i] = base[i] + (Math.random() - 0.5) * amt;
      pos.needsUpdate = true;
    }
  };
}

/* LineSegments from [[a, b], [a, b], ...] pairs of [x, y, z] */
export function segs(pairs, color = INK, opacity = 0.85) {
  const pts = [];
  pairs.forEach(([a, b]) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b)));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

/* a pencil circle in the XZ plane (or XY with flat = false) */
export function ring(r, color = INK, n = 18, flat = true, opacity = 0.85) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(flat ? [Math.cos(a) * r, 0, Math.sin(a) * r] : [Math.cos(a) * r, Math.sin(a) * r, 0]);
  }
  return line(pts, color, opacity);
}

/* a row of handwritten controls/readouts under the canvas */
export function ui(el, html) {
  const d = document.createElement("div");
  d.className = "sk-ui";
  d.innerHTML = html;
  const cap = el.querySelector(".caption");
  el.insertBefore(d, cap || null);
  return d;
}

export const gauss = () => {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
