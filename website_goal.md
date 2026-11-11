# Karan's Lab Notebook: website build brief

## 1. The goal in one paragraph

Build a personal portfolio site for Karan (robotics researcher, UTS Sydney, GitHub: karanS08) that does not look like a portfolio. It looks and feels like a raw, physical lab notebook. Each project is one dated entry written on its own A4 page, in a handwriting font, on ruled paper with a red margin line. A visitor flips through the pages from childhood to now and learns how Karan thinks, what he builds, what broke, and what he learned. It is not a CV and not a showcase grid. It is a story told one dated page at a time.

The feel is the early personal web: plain, fast, honest, slightly quirky. No frameworks, no hero banners, no stock photos, no "Hire me" buttons. Reference sites Karan likes: tantek.com, ruina.tam.cornell.edu, danluu.com, Michael Nielsen's notebook (michaelnotebook.com). A mock-up he approved is the visual reference (see section 4).

## 2. Hard constraints

- Plain HTML, CSS and vanilla JavaScript. No React, no Tailwind, no build step, no analytics or trackers. The one allowed library is three.js (section 7a), vendored as a single file (`/js/vendor/three.module.min.js`, pinned version, ES module), not loaded from a CDN at runtime.
- Must work with JavaScript disabled: every entry is a normal HTML page you can read and link to. JS adds page-turn niceties (keyboard arrows, timeline highlighting) and the quirky three.js sketches, all as progressive enhancement.
- Hosted free on GitHub Pages (repo `karanS08.github.io`). All paths relative so it also works from a folder opened locally.
- Fast: a full entry page under 300 KB excluding video. Fonts and images self-hosted.
- Works on phone, tablet and desktop. Prints sensibly (one entry per A4 sheet).

## 3. Structure

```
/index.html                 cover page + table of contents (the timeline)
/entries/000-toys.html      one file per entry, same template
/entries/001-hot-glue-arm.html
...
/css/notebook.css           all styling; design tokens as CSS variables at the top
/js/notebook.js             optional: arrow-key page turning, timeline highlight
/fonts/                     handwriting font (see section 5)
/img/doodles/               transparent PNG/SVG margin doodles
/img/photos/                project photos, optimised (WebP/JPEG)
/video/                     compressed clips (MP4 H.264 + optional WebM)
```

Navigation: each entry has "← previous page" and "next page →" links at the bottom (plain `<a>`), plus a small "back to contents" link. Left/right arrow keys also turn pages when JS is on. The URL of each entry is stable and shareable.

## 4. Visual design (the approved mock-up)

**The page**
- A4 proportion (210 × 297 mm, ratio 1 : 1.414), centred on a plain darker desk background (a flat warm grey or a very subtle paper-on-desk tone, no gradients or fancy textures).
- Paper: off-white (about `#fbf8ef`), faint blue-grey horizontal ruled lines made with CSS (`repeating-linear-gradient`), and a single thin red vertical margin line about 12% from the left. Body text sits on the lines (line-height equals the ruling interval).
- Soft, small drop shadow so the page feels like a sheet on a desk. No rounded corners beyond 2 px.
- On desktop the page is about 794 px wide (96 dpi A4), scaled with `min()`/`clamp()` so it never overflows. On phones it fills the width with a 16 px gutter and keeps the A4 look (taller than the screen is fine; the page scrolls).
- Optional: a CSS variable `--paper` so the paper colour can switch to a yellow-tinted version later without touching anything else.

**Type**
- Handwriting font for: the date at the top, entry titles, margin notes, crossed-out corrections, "Lesson:" lines.
- A clean, readable font (system serif or a plain humanist sans) for body paragraphs, so long text does not tire the reader. Karan may later replace the handwriting font with his own (see section 5); use a CSS variable `--font-hand` so it is a one-line swap.
- Titles about 28–32 px, body about 17–18 px, never below 16 px on mobile.

**Per-page layout (top to bottom)**
1. Handwritten date, top right, like someone wrote it before starting (for example "November 2017"). For childhood: "Childhood". Unknown dates: show a rough label (for example "Third year") instead of leaving it blank.
2. Entry number and title in handwriting, for example "Entry 001: The hot-glue arm".
3. Short labelled lines in the style of a lab log: **When / Cost / Built with / Goal / What I had / What broke / Lesson**, using bold labels, then the story text.
4. Photos or video, if any, placed like taped-in prints: slightly rotated (-2° to 2°), with a tiny strip of translucent "tape" at the top corners made in CSS, and a handwritten caption underneath.
5. Margin notes: short handwritten asides in the left or right margin, for example "Hot glue is not a structural material." and "Fixed it? No. The pandemic ended first."
6. Little human touches: a few words struck through with a scribbly CSS line and the correction written next to them (`<s class="scribble">strong</s> <span class="fix">wobbly</span>`), and a small hand-drawn robot doodle in a corner or at the bottom of some pages (as if he got bored while writing). Doodles are transparent images pinned with CSS, slightly rotated. Not every page needs one.
7. Footer: page number ("page 3 of 23") in handwriting, prev/next links.

**The timeline (the spine of the site)**
- On the contents page (`index.html`): a vertical dated timeline listing every entry from the earliest to the latest: date, entry number, title, one-line hook. Each row is a link. Group by part: Part One: Tinkering, Part Two: Research, Part Three: Plaksha, Part Four: Sydney. Gaps in time should be visible (spacing proportional to time is a nice-to-have, a plain ordered list is acceptable).
- On entry pages: a slim timeline strip (a dotted line with small dots, one per entry, current one highlighted) at the top or in the side margin on wide screens, hidden or collapsed on phones.
- Plain-text tone, no animation beyond a very quick fade when a page loads. Respect `prefers-reduced-motion`.

**Cover page**
- Looks like the front of the notebook: title "Karan's Lab Notebook", subtitle "Not a CV. A log of things I built, how I thought, what broke, what I learned." and the small note "Early entries built before ChatGPT. Every bug was read, not prompted." Then the timeline/contents. Links to GitHub (karanS08), email (0802karans@gmail.com), and papers (arXiv/ACRA once available). A "Last updated" date at the very bottom, old-web style.

## 5. Handwriting font

- Default for now: a free Google font such as Caveat or Patrick Hand, downloaded and self-hosted (WOFF2) from `/fonts/`, not loaded from Google at runtime.
- Karan plans to make his own font from his handwriting (iPad, free tools such as fontsketch or Handwrite). When he does, drop the WOFF2 into `/fonts/` and change `--font-hand`. Keep `font-display: swap` and a fallback stack (`"MyHand", "Caveat", cursive`).

## 6. Entries and dates

Content comes from Karan's "Karan's Lab Notebook" doc (22 entries plus cover, already written in his voice; do not rewrite his wording). Known dates; the rest are rough labels until Karan confirms them.

| # | Date label | Title |
|---|---|---|
| 000 | Childhood | The kid who broke every toy |
| 001 | November 2017 | The hot-glue arm |
| 002 | around 2018 | The workshop car (brief) |
| 003 | early college | I learned to read errors before I learned to write code |
| 004 | October 2020 | The bot that attended my classes |
| 005 | second year (date TBD) | Revisiting the hot-glue arm (6DOF, 3D printed) |
| 006 | third year, sem 1 (TBD) | CanSat, or how systems get built |
| 007 | third year, sem 2 (TBD) | Taiwan (Part Two: Research begins) |
| 008 | Taiwan | A drone that lands when I make a fist |
| 009 | final undergrad project | A tiny satellite and a lying IMU |
| 010 | Plaksha | Teaching 80 people to build a robot |
| 011 | Plaksha | Self-balancing robots, and why math matters |
| 012 | Plaksha | A cart-pole that balances like a person |
| 013 | Plaksha | Blimps from bin bags |
| 014 | Plaksha | Redesigning a glider for 100 kids |
| 015 | Plaksha | Lasers in sugarcane juice |
| 016 | Plaksha RA | Finding the gaps in a sugarcane field |
| 017 | 26 February | Sydney |
| 018 | UTS | Pepper, and where the memory idea started |
| 019 | UTS | The capstone, underwater (AUV-7) |
| 020 | UTS | Space Robotics |
| 021 | 2026 | RPV-Mem: a robot that remembers what it wasn't looking for |

Put all dates in one small data comment or a single list at the top of `index.html` so they are easy to edit later. Use a `<time datetime="...">` element where a real date exists.

## 7. Media

- Two attached clips of the hot-glue arm (about 23 MB and 8 s / 17 MB and 11 s, 1920×1080 source, portrait content) belong on Entry 001. Compress to about 2–3 MB each (H.264, 720p or smaller, CRF about 28, no audio, `+faststart`), loop, muted, `playsinline`, with a poster frame and `preload="metadata"`. Do not autoplay with sound.
- Other placeholders Karan will supply later: 3D printer timelapse (005), head-tracking arm (005), Tello gesture clip (008), IMU 3D-model tilt GIF (009), glider photo (014), sugarcane gap map before/after (016), RPV-Mem demo (021). Leave clearly marked empty slots (a taped-in blank frame with a handwritten "[photo coming]") so the layout is final even without the media.
- All images need meaningful `alt` text. Convert big photos to WebP/JPEG at most about 1200 px wide.

## 7a. Quirky 3D bits (three.js)

Karan wants a few playful three.js moments. They must feel like they belong in a paper notebook, not like a tech demo: think pencil sketches that come alive.

**Look**
- Draw everything as line art: `EdgesGeometry` + `LineBasicMaterial` (or thin `Line2` strokes) in a pencil/ink colour (`#2b2b2b` at about 85% opacity, occasional blue-ink `#2a4d8f`). No lighting, no shading, no textures, transparent canvas background so the ruled paper shows through.
- Slight hand-drawn wobble: jitter vertices a tiny amount every few frames (a "boiling line" effect, like animated sketches), and keep it subtle.
- Canvases sit inside the page like doodles: small (about 160–320 px), placed in a margin, a corner, or as a taped-in "figure" with a handwritten caption.

**Ideas, in priority order (build 1–3; 4–6 are nice-to-have)**
1. **Cover: the hot-glue arm follows you.** A wireframe of the 3DOF arm (two stacked boxy servos, a stick gripper) on the cover. Its joints turn to point at the mouse cursor (or touch point on phones). This is a nod to the 6DOF arm that tracked Karan's head. Caption: "it still follows people around".
2. **Entry 009: the tiny satellite tilts.** A wireframe cube with little antennas. On desktop it tilts with the mouse; on phones it uses `DeviceOrientationEvent` (ask permission on iOS with a small handwritten "tilt me?" button), echoing his CanSat ground-station 3D model. Show three tiny handwritten readouts beside it (roll / pitch / yaw) that update live, with a deliberately noisy jitter and a "Kalman: on/off" toggle that smooths them. That toggle *is* the entry's lesson.
3. **Entry 021: did you see the pen?** A small sketched table with a few objects (wallet, cup, book, pen). The visitor is asked "find the wallet" by clicking it; afterwards the objects fade and the page asks "did you see a pen? where?". Clicking roughly the right spot draws a handwritten tick. Memory confidence visibly decays over time (the remembered outline fades), which explains RPV-Mem's temporal decay in five seconds.
4. **Entry 012: the cart-pole.** A sketched cart and pole; the visitor clicks to "push" it. Small pushes are fixed by the ankle joint, big pushes make the cart step. Simple 2D physics is fine.
5. **Entry 008: the drone.** A wireframe quadcopter hovering in the margin; clicking makes it land (fist), clicking again makes it take off (open hand).
6. **Margin robot.** A tiny line-art robot that occasionally walks along the bottom edge of a page, trips over the margin line, and gets up. Rare (for example once per visit) so it stays a surprise.

**Rules**
- Each sketch is its own ES module in `/js/sketches/` and is only loaded when its container scrolls into view (`IntersectionObserver` + dynamic `import()`). Pages with no sketch load no three.js at all.
- Pause rendering when off-screen or the tab is hidden; cap pixel ratio at 2; target 60 fps but never burn CPU while idle (render on input or at a low tick when static).
- Without JS, with WebGL unavailable, or with `prefers-reduced-motion: reduce`, show a static hand-drawn SVG/PNG of the same sketch instead. Nothing on the page depends on the 3D working.
- Keep each sketch module under about 15 KB (three.js itself excluded). Total three.js payload loaded once and cached.
- Canvases get an `aria-label` describing what they show, and interactive ones are keyboard-usable (arrow keys tilt the satellite, Enter pushes the cart-pole).

## 8. Accessibility and quality

- Semantic HTML: one `<h1>` per page, `<article>` for the entry, `<nav>` for page links and timeline, real `<a>` links, visible focus outlines.
- Contrast: body text at least 4.5:1 against the paper; handwriting text at least 3:1 and never smaller than 20 px.
- The ruled lines and margin are decoration only (CSS backgrounds), not content.
- Reduced-motion and print styles (`@media print`: one entry per A4 page, no desk background, no nav).
- Test at 360 px, 768 px and 1440 px widths. No horizontal scroll at any size.

## 8a. How to work (for Claude Code)

1. Before writing any CSS, load and follow the **frontend-design** skill. Use it to commit to the notebook aesthetic (paper, ink, handwriting) and avoid generic templated layouts.
2. Build the shared template and CSS first, with entries 000, 001 and the cover. Show those before building the rest.
3. Check every page visually in a real browser (Playwright/Chromium screenshots) at **360 px, 768 px and 1440 px** widths, plus a print preview. Look for horizontal scroll, text off the ruled lines, overlapping doodles, unreadable handwriting, and media spilling outside the page. Fix and re-check before calling a page done.
4. For each three.js sketch, check it renders, responds to mouse/touch/keyboard, pauses off-screen, and that its static fallback shows with JS off and with reduced motion on.
5. Compress media with ffmpeg using the settings in section 7 before committing; never commit the original 20 MB clips.

## 9. Definition of done

1. `index.html` shows the cover and the full timeline; all 22 entries open and are linked prev/next in order.
2. Every entry matches the page layout in section 4 and uses the text from Karan's doc unchanged.
3. Entry 001 plays the compressed hot-glue clips.
4. The site passes the constraints in section 2 (no JS required, no external requests, small pages) and works on a phone.
5. Handwriting font is one variable swap; paper colour is one variable swap.
5a. Three.js sketches 1–3 from section 7a work on desktop and phone, lazy-load, and fall back to static drawings.
6. A short README explains how to add a new entry (copy the template, add one line to the timeline) and how to deploy to GitHub Pages.

## 10. Tone reminders for any new copy

First person, plain, a bit dry and self-aware. Honest about failures ("Fixed it? No. The pandemic ended first."). No marketing language, no superlatives. Short lines of lab-log structure beat long paragraphs.
