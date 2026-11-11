/* Entry 012: a cart-pole that balances like a person. Small pushes are
   caught by the ankle (a torque-limited joint at the base of the pole);
   when the ankle saturates, the cart steps under the pole. */
import { stage, pencil, segs, ring, ui, THREE, INK, BLUE, RED } from "./_pencil.js";

const G = 9.8, L = 1.0, TMAX = 7, STEP_AT = 0.16;

export default function (el) {
  const s = stage(el, { aspect: 1.5, fov: 30, dist: 12 });
  s.camera.position.y = 1.2;

  const ground = segs([[[-9, -1.65, 0], [9, -1.65, 0]]], INK, 0.6);
  const ticks = [];
  for (let x = -9; x <= 9; x += 0.8) ticks.push([[x, -1.65, 0], [x - 0.25, -1.9, 0]]);
  const hatch = segs(ticks, INK, 0.25);
  s.scene.add(ground, hatch);

  const cart = new THREE.Group();
  cart.add(pencil(new THREE.BoxGeometry(1.8, 0.6, 0.01)));
  [-0.55, 0.55].forEach((x) => { const w = ring(0.26, INK, 14, false); w.position.set(x, -0.5, 0); cart.add(w); });
  const ankle = ring(0.13, RED, 12, false);
  ankle.position.y = 0.42;
  cart.add(ankle);
  cart.position.y = -0.9;
  s.scene.add(cart);

  const pole = new THREE.Group();
  pole.position.y = 0.42;
  pole.add(segs([[[0, 0, 0], [0, 2.7, 0]]], INK, 0.9));
  const bob = ring(0.24, INK, 14, false);
  bob.position.y = 2.9;
  pole.add(bob);
  cart.add(pole);
  s.wobble(cart, 0.012);

  const box = ui(el, `<button type="button" class="btn" data-n>nudge</button>
    <button type="button" class="btn" data-s>shove</button>
    <span class="readout" data-m>standing.</span>`);
  const modeEl = box.querySelector("[data-m]");

  // state: cart x, v; pole angle th (0 = upright, + = leaning right), w
  let x = 0, v = 0, th = 0, w = 0, mode = "standing.", fallen = 0;
  const push = (k, dir = Math.random() < 0.5 ? -1 : 1) => { if (!fallen) w += k * dir; s.poke(4000); };
  box.querySelector("[data-n]").addEventListener("click", () => push(0.7));
  box.querySelector("[data-s]").addEventListener("click", () => push(2.6));
  s.canvas.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = s.canvas.getBoundingClientRect();
    const dir = e.clientX < r.left + r.width / 2 ? 1 : -1; // push away from the click
    push(0.7, dir);
  });
  el.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    push(e.shiftKey ? 2.6 : 0.7);
  });

  function step(dt) {
    // the ankle: PD on the angle, limited torque (as angular acceleration)
    let tau = -(40 * th + 9 * w);
    const sat = Math.abs(tau) > TMAX;
    tau = Math.max(-TMAX, Math.min(TMAX, tau));
    // the step: if the ankle can't hold it, move the cart under the pole
    let a = 0;
    if (sat || Math.abs(th) > STEP_AT) {
      a = 34 * th + 9 * w;
      mode = "step!";
    } else {
      a = -1.4 * x - 2.2 * v; // wander back home
      mode = Math.abs(tau) > 0.6 ? "ankle." : "standing.";
    }
    a = Math.max(-25, Math.min(25, a));
    const alpha = (G * Math.sin(th) - a * Math.cos(th)) / L + tau;
    w += alpha * dt; th += w * dt;
    v += a * dt; x += v * dt;
    if (Math.abs(x) > 4) { x = Math.sign(x) * 4; v = 0; }
    if (Math.abs(th) > 1.2) { fallen = 1.4; mode = "fell over. again?"; }
  }

  s.onFrame = (dt) => {
    if (fallen > 0) {
      fallen -= dt;
      th = Math.sign(th || 1) * Math.min(1.45, Math.abs(th) + dt * 3);
      if (fallen <= 0) { fallen = 0; x = v = th = w = 0; mode = "standing."; }
    } else {
      for (let i = 0; i < 6; i++) step(dt / 6);
    }
    cart.position.x = x;
    pole.rotation.z = -th;
    modeEl.textContent = mode;
    modeEl.style.color = mode === "step!" ? "var(--ink-red)" : "";
    if (Math.abs(w) > 0.01 || Math.abs(v) > 0.01 || fallen) s.poke(300);
  };
  s.start();
}
