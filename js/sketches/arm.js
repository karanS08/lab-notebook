/* Cover: the hot-glue arm (3DOF) turns to point at your cursor or finger. */
import { stage, pencil, line, THREE, INK, BLUE } from "./_pencil.js";

export default function (el) {
  const s = stage(el, { aspect: 1, fov: 32, dist: 11 });
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  const root = new THREE.Group();
  root.position.y = -2.4;
  s.scene.add(root);

  // base plate + bottom servo (yaw)
  root.add(pencil(box(3.2, 0.25, 2.2)));
  const yaw = new THREE.Group();
  yaw.position.y = 0.6;
  root.add(yaw);
  yaw.add(pencil(box(1.2, 0.9, 0.7)));

  // shoulder servo (pitch) + upper arm (a cut acrylic ruler)
  const shoulder = new THREE.Group();
  shoulder.position.y = 0.75;
  yaw.add(shoulder);
  shoulder.add(pencil(box(0.7, 0.6, 1.1)));
  const upper = pencil(box(0.32, 2.6, 0.1));
  upper.position.y = 1.3;
  shoulder.add(upper);

  // elbow servo + forearm
  const elbow = new THREE.Group();
  elbow.position.y = 2.6;
  shoulder.add(elbow);
  elbow.add(pencil(box(0.6, 0.55, 0.9)));
  const fore = pencil(box(0.3, 2.1, 0.1));
  fore.position.y = 1.05;
  elbow.add(fore);

  // gripper: two ice-cream sticks
  const grip = new THREE.Group();
  grip.position.y = 2.1;
  elbow.add(grip);
  const stickL = line([[-0.08, 0, 0], [-0.32, 0.9, 0], [-0.2, 1.05, 0]], BLUE);
  const stickR = line([[0.08, 0, 0], [0.32, 0.9, 0], [0.2, 1.05, 0]], BLUE);
  grip.add(stickL, stickR);

  // hot-glue blobs, because of course
  [[0.55, 0.15], [-0.5, 0.2]].forEach(([x, y]) => {
    const g = pencil(new THREE.SphereGeometry(0.13, 5, 3), INK, 0.4);
    g.position.set(x, y, 0.4);
    yaw.add(g);
  });

  s.wobble(root, 0.018);

  // aim at pointer
  let tx = 0.3, ty = 0.2;
  const aim = (cx, cy) => {
    const r = el.getBoundingClientRect();
    const ox = r.left + r.width / 2, oy = r.top + r.height * 0.72;
    tx = Math.max(-1, Math.min(1, (cx - ox) / (innerWidth * 0.45)));
    ty = Math.max(-1, Math.min(1, (oy - cy) / (innerHeight * 0.55)));
    s.poke();
  };
  addEventListener("pointermove", (e) => aim(e.clientX, e.clientY), { passive: true });
  addEventListener("pointerdown", (e) => aim(e.clientX, e.clientY), { passive: true });

  // lean in the screen plane toward the pointer, nod up/down with it
  let ax = 0, ay = 0;
  s.onFrame = (dt) => {
    const k = Math.min(1, dt * 6);
    ax += (tx - ax) * k;
    ay += (ty - ay) * k;
    yaw.rotation.y = ax * 0.5;
    shoulder.rotation.z = -ax * 0.55;
    shoulder.rotation.x = -0.15 - ay * 0.25;
    elbow.rotation.z = -ax * 0.65 - (1 - ay) * 0.25 * Math.sign(ax || 1);
    grip.rotation.z = -ax * 0.3;
    root.rotation.y = 0.35;
  };
  s.start();
}
