/* Entry 021: did you see the pen? Find the wallet; then the table clears
   and you're asked where the pen was. The remembered outlines fade with
   time, the way RPV-Mem's confidence in a memory decays. */
import { stage, pencil, segs, ui, THREE, INK, BLUE, RED } from "./_pencil.js";

const TAU = 7; // seconds for confidence to fall to ~37%

export default function (el) {
  const s = stage(el, { aspect: 1.35, fov: 34, dist: 11 });
  s.camera.position.set(0, 7, 7.5);
  s.camera.lookAt(0, -0.4, 0);

  // the table
  const table = new THREE.Group();
  table.add(segs([
    [[-4, 0, -2.4], [4, 0, -2.4]], [[4, 0, -2.4], [4, 0, 2.4]], [[4, 0, 2.4], [-4, 0, 2.4]], [[-4, 0, 2.4], [-4, 0, -2.4]],
    [[-4, -0.25, 2.4], [4, -0.25, 2.4]], [[-4, 0, 2.4], [-4, -0.25, 2.4]], [[4, 0, 2.4], [4, -0.25, 2.4]],
    [[-3.6, -0.25, 2.2], [-3.6, -2.4, 2.2]], [[3.6, -0.25, 2.2], [3.6, -2.4, 2.2]],
  ], INK, 0.7));
  s.scene.add(table);
  s.wobble(table, 0.012);

  const KINDS = {
    wallet: () => new THREE.BoxGeometry(1.1, 0.16, 0.75),
    cup: () => new THREE.CylinderGeometry(0.36, 0.3, 0.75, 10, 1, true),
    book: () => new THREE.BoxGeometry(1.5, 0.28, 1.05),
    pen: () => new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6),
    keys: () => new THREE.TorusGeometry(0.28, 0.05, 4, 10),
  };
  const SPOTS = [[-2.7, -1.2], [-0.9, -1.4], [1.0, -1.2], [2.8, -1.3], [-2.4, 1.1], [-0.4, 1.0], [1.6, 1.2], [3.0, 0.8]];
  const objs = [];
  const hitMat = new THREE.MeshBasicMaterial();
  hitMat.visible = false;

  function place() {
    objs.forEach((o) => s.scene.remove(o.g, o.ghost));
    objs.length = 0;
    const spots = SPOTS.slice().sort(() => Math.random() - 0.5);
    Object.entries(KINDS).forEach(([name, geo], i) => {
      const g = new THREE.Group();
      const shape = geo();
      const edge = pencil(shape, name === "pen" ? BLUE : INK);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.1), hitMat);
      hit.userData.name = name;
      g.add(edge, hit);
      const [x, z] = spots[i];
      const h = name === "cup" ? 0.38 : name === "book" ? 0.14 : name === "keys" ? 0.06 : 0.09;
      g.position.set(x, h, z);
      g.rotation.y = Math.random() * Math.PI;
      if (name === "pen") edge.rotation.z = Math.PI / 2;
      if (name === "keys") edge.rotation.x = Math.PI / 2;
      // the memory of it: a dashed blue outline
      const gm = new THREE.LineDashedMaterial({ color: BLUE, dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: 0 });
      const ghost = new THREE.LineSegments(edge.geometry, gm);
      ghost.computeLineDistances();
      ghost.position.copy(g.position);
      ghost.rotation.copy(g.rotation);
      ghost.quaternion.multiply(edge.quaternion);
      s.scene.add(g, ghost);
      objs.push({ name, g, edge, ghost, x, z });
    });
    objs.forEach((o) => s.wobble(o.edge, 0.01));
  }

  const box = ui(el, `<span class="prompt">find the wallet.</span>
    <span class="readout" data-conf hidden></span>
    <button type="button" class="btn" data-again hidden>again</button>`);
  const prompt = box.querySelector(".prompt"), confEl = box.querySelector("[data-conf]");
  const again = box.querySelector("[data-again]");

  let phase = "find", t0 = 0, fade = 0, marks = [];
  const clock = new THREE.Clock();
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function mark(x, z, good) {
    const y = 0.12, k = 0.35;
    const m = good
      ? segs([[[x - k, y, z], [x - k * 0.3, y, z + k * 0.6]], [[x - k * 0.3, y, z + k * 0.6], [x + k * 1.2, y, z - k * 1.1]]], BLUE, 1)
      : segs([[[x - k, y, z - k], [x + k, y, z + k]], [[x - k, y, z + k], [x + k, y, z - k]]], RED, 1);
    s.scene.add(m);
    marks.push(m);
  }
  function reset() {
    marks.forEach((m) => s.scene.remove(m));
    marks = [];
    place();
    phase = "find";
    fade = 0;
    prompt.textContent = "find the wallet.";
    confEl.hidden = true;
    again.hidden = true;
    s.poke();
  }
  again.addEventListener("click", reset);

  s.canvas.addEventListener("click", (e) => {
    e.stopPropagation();
    const r = s.canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, s.camera);
    s.poke();
    if (phase === "find") {
      const hit = ray.intersectObjects(objs.map((o) => o.g), true).find((h) => h.object.userData.name);
      if (!hit) { prompt.textContent = "that's the table. find the wallet."; return; }
      const name = hit.object.userData.name;
      if (name !== "wallet") { prompt.textContent = `that's the ${name}. keep looking.`; return; }
      const w = objs.find((o) => o.name === "wallet");
      mark(w.x, w.z, true);
      prompt.textContent = "got it.";
      phase = "clearing";
      setTimeout(() => {
        phase = "recall";
        t0 = clock.getElapsedTime();
        prompt.textContent = "quick: did you see a pen? click where it was.";
        confEl.hidden = false;
        marks.forEach((m) => s.scene.remove(m));
        marks = [];
      }, 1100);
    } else if (phase === "recall") {
      const p = new THREE.Vector3();
      if (!ray.ray.intersectPlane(floor, p)) return;
      const pen = objs.find((o) => o.name === "pen");
      const conf = Math.exp(-(clock.getElapsedTime() - t0) / TAU);
      const ok = Math.hypot(p.x - pen.x, p.z - pen.z) < 1.0;
      mark(p.x, p.z, ok);
      if (!ok) mark(pen.x, pen.z, true);
      prompt.textContent = ok
        ? "yes. you saw it without looking for it."
        : "it was here. the memory had gone fuzzy.";
      confEl.textContent = `memory confidence when you answered: ${Math.round(conf * 100)}%`;
      phase = "done";
      again.hidden = false;
      objs.forEach((o) => (o.ghost.material.opacity = o.name === "pen" ? 0.9 : 0.15));
    }
  });

  s.onFrame = () => {
    const t = clock.getElapsedTime();
    if (phase === "clearing" || phase === "recall" || phase === "done") fade = Math.min(1, fade + 0.06);
    objs.forEach((o) => (o.edge.material.opacity = 0.85 * (1 - fade)));
    if (phase === "recall") {
      const conf = Math.exp(-(t - t0) / TAU);
      objs.forEach((o) => (o.ghost.material.opacity = 0.75 * conf));
      confEl.textContent = `memory confidence: ${Math.round(conf * 100)}%`;
      s.poke(200);
    }
    if (phase === "clearing") s.poke(200);
  };
  place();
  s.start();
}
