/* Paper sounds, synthesised with Web Audio. No audio files.
   Browsers only allow sound after a click, tap or key press on the page
   (scrolling does not count), so the first such gesture unlocks it.
   A small toggle in the corner turns it off; the choice is remembered. */
(function () {
  "use strict";
  const KEY = "nb-sound";
  let on = true;
  try { on = localStorage.getItem(KEY) !== "off"; } catch (_) {}
  let ctx = null, noise = null;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
      noise = makeNoise();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function makeNoise() {
    const len = Math.floor(ctx.sampleRate * 1.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      brown = (brown + 0.05 * w) / 1.05;
      d[i] = w * 0.55 + brown * 3.2; // white for the crisp edge, brown for body
    }
    return buf;
  }
  const live = () => !!ctx && ctx.state === "running";
  const GESTURES = ["pointerdown", "keydown", "touchend"];
  function unlock(e) {
    if (e.target && e.target.closest && e.target.closest(".sound-toggle")) return; // the button handles itself
    if (!on) return;
    ac();
    GESTURES.forEach((g) => removeEventListener(g, unlock, true));
    setTimeout(paint, 60);
  }
  GESTURES.forEach((g) => addEventListener(g, unlock, true));

  /* band-passed noise sweep with a few random dips = paper crinkle */
  function rustle(t0, dur, f0, f1, gain, q = 0.9) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 280;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.18);
    for (let k = 1; k < 5; k++) {
      g.gain.setValueAtTime(gain * (0.4 + Math.random() * 0.6), t0 + dur * (0.2 + 0.15 * k));
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(hp).connect(g).connect(ctx.destination);
    src.start(t0, Math.random() * 0.5, dur + 0.05);
  }
  /* the page (or board) landing */
  function thump(t0, gain, f) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t0);
    o.frequency.exponentialRampToValueAtTime(f * 0.55, t0 + 0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.2);
    rustle(t0, 0.07, 1900, 900, gain * 0.7, 0.6);
  }

  const api = {
    get on() { return on; },
    /* one page turning over */
    flip() {
      if (!on || !ctx || !ac()) return; // silent until a click/tap/key unlocks audio
      const t = ctx.currentTime + 0.01, d = 0.22 + Math.random() * 0.08;
      rustle(t, d, 900 + Math.random() * 300, 3200 + Math.random() * 800, 0.32);
      rustle(t + d * 0.55, d * 0.6, 2400, 5200, 0.1, 1.4);
      thump(t + d * 0.92, 0.1, 120);
    },
    /* the hard cover swinging open (or shut) */
    cover() {
      if (!on || !ctx || !ac()) return; // silent until a click/tap/key unlocks audio
      const t = ctx.currentTime + 0.01;
      rustle(t, 0.55, 320, 1300, 0.28, 0.7);
      rustle(t + 0.1, 0.38, 1500, 3600, 0.1, 1.2);
      thump(t + 0.52, 0.32, 78);
    },
    /* a few pages riffling past */
    riffle(n = 4) {
      if (!on || !ctx || !ac()) return; // silent until a click/tap/key unlocks audio
      const t = ctx.currentTime + 0.01;
      for (let i = 0; i < n; i++) rustle(t + i * 0.075, 0.13, 1800, 4600, 0.14 - i * 0.02, 1.1);
    },
    /* desk noises: click, hiss, slurp, pour, beep, whir, zip */
    fx(name) {
      if (!on || !ctx || !ac()) return;
      const t = ctx.currentTime + 0.01;
      const tone = (type, f0, f1, dur, gain) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.05);
      };
      if (name === "click") rustle(t, 0.035, 3800, 2600, 0.22, 2.5);
      else if (name === "hiss") rustle(t, 0.9, 5200, 7000, 0.07, 0.6);
      else if (name === "slurp") { rustle(t, 0.32, 420, 1300, 0.2, 3); rustle(t + 0.12, 0.2, 900, 1800, 0.12, 4); }
      else if (name === "pour") rustle(t, 1.1, 500, 900, 0.14, 1.5);
      else if (name === "beep") tone("sine", 2600, 2600, 0.22, 0.05);
      else if (name === "whir") { tone("sawtooth", 140, 260, 0.9, 0.03); rustle(t, 0.9, 1800, 2600, 0.05, 1); }
      else if (name === "zip") rustle(t, 0.22, 2400, 700, 0.12, 2);
      else if (name === "squeak") { tone("sine", 900, 1700, 0.12, 0.06); setTimeout(() => api.fx("squeak2"), 110); }
      else if (name === "squeak2") tone("sine", 1500, 1000, 0.14, 0.05);
    },
    toggle() {
      if (on && !live()) { ac(); api.flip(); setTimeout(paint, 60); return; } // first tap: just unlock
      on = !on;
      try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (_) {}
      if (on) { ac(); api.flip(); }
      paint();
    },
  };
  window.NotebookSound = api;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sound-toggle";
  function paint() {
    btn.textContent = !on ? "\u266A sound off" : live() ? "\u266A sound on" : "\u266A tap for sound";
    btn.setAttribute("aria-pressed", String(on));
    btn.title = on ? "Turn page sounds off" : "Turn page sounds on";
  }
  paint();
  btn.addEventListener("click", api.toggle);
  document.body.appendChild(btn);
})();
