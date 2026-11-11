/* Entry 008: the Tello that follows you. It drifts toward the pointer;
   click (a fist) to land it, click again (open hand) to take off. */
import { stage, pencil, segs, ring, ui, THREE, INK, BLUE } from "./_pencil.js";

export default function (el) {
  const s = stage(el, { aspect: 1.4, fov: 32, dist: 11 });
  s.camera.position.set(0, 2.4, 11);
  s.camera.lookAt(0, 0, 0);

  const ground = segs([[[-7, -2.2, 0], [7, -2.2, 0]]], INK, 0.45);
  s.scene.add(ground);

  const quad = new THREE.Group();
  quad.add(pencil(new THREE.BoxGeometry(0.9, 0.28, 1.2)));
  const arms = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  quad.add(segs(arms.map(([a, b]) => [[0, 0, 0], [a * 1.05, 0.05, b * 1.05]]), INK, 0.9));
  const props = arms.map(([a, b]) => {
    const g = new THREE.Group();
    g.position.set(a * 1.05, 0.18, b * 1.05);
    g.add(ring(0.55, INK, 16, true, 0.55));
    const blade = segs([[[-0.5, 0, 0], [0.5, 0, 0]]], BLUE, 0.9);
    g.add(blade);
    g.userData.blade = blade;
    quad.add(g);
    return g;
  });
  quad.add(segs([[[0.25, -0.14, 0.3], [0.32, -0.42, 0.42]], [[-0.25, -0.14, 0.3], [-0.32, -0.42, 0.42]],
    [[0.25, -0.14, -0.3], [0.32, -0.42, -0.42]], [[-0.25, -0.14, -0.3], [-0.32, -0.42, -0.42]]], INK, 0.7)); // feet
  s.scene.add(quad);
  s.wobble(quad, 0.012);

  const box = ui(el, `<button type="button" class="btn" data-f>&#9994; make a fist (land)</button>`);
  const btn = box.querySelector("[data-f]");
  let flying = true, y = 0.4, tx = 0, x = 0, spin = 1, t = 0;
  const toggle = () => {
    flying = !flying;
    btn.innerHTML = flying ? "&#9994; make a fist (land)" : "&#9995; open hand (take off)";
    s.poke(3000);
  };
  btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  s.canvas.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
  el.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault(); e.stopPropagation(); toggle();
  });
  // head tracking, more or less: follow the pointer across the page
  addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    tx = Math.max(-3.2, Math.min(3.2, ((e.clientX - r.left) / r.width - 0.5) * 7));
    s.poke(800);
  }, { passive: true });

  s.onFrame = (dt) => {
    t += dt;
    const ty = flying ? 0.4 + Math.sin(t * 2.1) * 0.12 : -1.72;
    y += (ty - y) * Math.min(1, dt * (flying ? 2.2 : 1.6));
    const grounded = !flying && y < -1.6;
    const vx = flying ? (tx - x) * Math.min(1, dt * 1.8) : 0;
    x += vx;
    spin += ((flying || !grounded ? 1 : 0) - spin) * Math.min(1, dt * 2);
    props.forEach((p, i) => (p.userData.blade.rotation.y += dt * 38 * spin * (i % 2 ? 1 : -1)));
    quad.position.set(x, y, 0);
    quad.rotation.z = -vx * 2.2;
    quad.rotation.y = Math.sin(t * 0.7) * 0.25;
    if (flying || !grounded) s.poke(200);
  };
  s.start();
}
