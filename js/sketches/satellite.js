/* Entry 009: the tiny satellite tilts with your pointer, arrow keys or
   phone. The readouts come from a deliberately bad "IMU"; the Kalman
   switch is the whole lesson of the entry. */
import { stage, pencil, segs, line, ui, gauss, THREE, INK, BLUE, RED } from "./_pencil.js";

export default function (el) {
  const s = stage(el, { aspect: 1.3, fov: 30, dist: 11 });
  const sat = new THREE.Group();
  sat.rotation.order = "YXZ";
  s.scene.add(sat);
  sat.add(pencil(new THREE.BoxGeometry(2.4, 2.4, 2.4)));
  // solar cells on the front and right faces
  const cells = [];
  for (const t of [-0.4, 0.4]) {
    cells.push([[-1.2, t, 1.21], [1.2, t, 1.21]], [[t, -1.2, 1.21], [t, 1.2, 1.21]]);
    cells.push([[1.21, t, -1.2], [1.21, t, 1.2]], [[1.21, -1.2, t], [1.21, 1.2, t]]);
  }
  sat.add(segs(cells, BLUE, 0.6));
  sat.add(line([[0.9, 1.2, 0.9], [1.7, 2.6, 1.5], [1.9, 2.5, 1.6]]));
  sat.add(line([[-0.9, 1.2, -0.9], [-1.6, 2.5, -1.4]]));
  sat.add(segs([[[0, -1.2, 0], [0, -1.7, 0]]], RED, 0.7)); // altimeter port
  s.wobble(sat, 0.014);

  const box = ui(el, `
    <span class="readout">roll <b data-r>0.0</b>&deg;</span>
    <span class="readout">pitch <b data-p>0.0</b>&deg;</span>
    <span class="readout">yaw <b data-y>0.0</b>&deg;</span>
    <button type="button" class="btn" data-k aria-pressed="false">Kalman: off</button>
    <button type="button" class="btn" data-tilt hidden>tilt me?</button>`);
  const out = { r: box.querySelector("[data-r]"), p: box.querySelector("[data-p]"), y: box.querySelector("[data-y]") };
  const kBtn = box.querySelector("[data-k]");
  let kalman = false;
  kBtn.addEventListener("click", () => {
    kalman = !kalman;
    kBtn.textContent = `Kalman: ${kalman ? "on" : "off"}`;
    kBtn.setAttribute("aria-pressed", String(kalman));
    s.poke();
  });

  // the true attitude: pointer, keys or phone
  const truth = { r: 10, p: -15, y: 25 };
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    truth.r = ((e.clientX - r.left) / r.width - 0.5) * 80;
    truth.p = ((e.clientY - r.top) / r.height - 0.5) * 80;
    s.poke();
  });
  el.tabIndex = 0;
  el.addEventListener("keydown", (e) => {
    const k = { ArrowLeft: ["r", -6], ArrowRight: ["r", 6], ArrowUp: ["p", -6], ArrowDown: ["p", 6] }[e.key];
    if (!k) return;
    e.preventDefault();
    e.stopPropagation();
    truth[k[0]] = Math.max(-60, Math.min(60, truth[k[0]] + k[1]));
    s.poke();
  });
  const onTilt = (e) => {
    if (e.gamma == null) return;
    truth.r = e.gamma; truth.p = e.beta - 45; truth.y = e.alpha || truth.y;
    s.poke();
  };
  if (window.DeviceOrientationEvent && matchMedia("(pointer: coarse)").matches) {
    const tb = box.querySelector("[data-tilt]");
    tb.hidden = false;
    tb.addEventListener("click", async () => {
      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return;
        }
        addEventListener("deviceorientation", onTilt);
        tb.textContent = "tilting!";
      } catch (_) { tb.textContent = "no gyro :("; }
    });
  }

  // a cheap IMU: noise plus the odd spike. one scalar Kalman filter per axis.
  const kf = { r: [0, 30], p: [0, 30], y: [0, 30] };
  const Q = 0.5, R = 30;
  const shown = { r: 0, p: 0, y: 0 };
  let tick = 0;
  s.onFrame = (dt) => {
    truth.y += dt * 9;
    for (const a of ["r", "p", "y"]) {
      const z = truth[a] + gauss() * 5.5 + (Math.random() < 0.03 ? (Math.random() - 0.5) * 50 : 0);
      const f = kf[a];
      f[1] += Q;
      const K = f[1] / (f[1] + R);
      f[0] += K * (z - f[0]);
      f[1] *= 1 - K;
      shown[a] = kalman ? f[0] : z;
    }
    const d = Math.PI / 180;
    sat.rotation.set(shown.p * d, shown.y * d, -shown.r * d);
    if ((tick = (tick + 1) % 3) === 0) {
      out.r.textContent = shown.r.toFixed(1);
      out.p.textContent = shown.p.toFixed(1);
      out.y.textContent = (((shown.y % 360) + 360) % 360).toFixed(1);
    }
  };
  s.start();
}
