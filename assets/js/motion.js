// LocBike — motion: scroll-driven riders, reveals, link/click effects.
// Everything here is decorative; the page works without it.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Rider (SVG cyclist with spinning wheels + pedalling legs) ---------- */

// Geometry in viewBox units (0 0 120 90)
const WHEEL_R = 17;
const REAR = [24, 70];
const FRONT = [96, 70];
const BB = [54, 70]; // bottom bracket (crank centre)
const HIP = [47, 36];
const CRANK = 7;
const THIGH = 22;
const SHIN = 22;
const PEDAL_RATIO = 0.6; // crank turns per wheel turn

const RIDER_MARKUP = `
  <g class="rider__tilt">
    <polyline class="rider__leg rider__leg--far" data-leg="far" />
    <g data-wheel="rear">
      <circle class="rider__tire" cx="24" cy="70" r="17" />
      <path class="rider__spokes" d="M24 53V87M9.3 61.5L38.7 78.5M9.3 78.5L38.7 61.5" />
    </g>
    <g data-wheel="front">
      <circle class="rider__tire" cx="96" cy="70" r="17" />
      <path class="rider__spokes" d="M96 53V87M81.3 61.5L110.7 78.5M81.3 78.5L110.7 61.5" />
    </g>
    <path class="rider__frame" d="M24 70L54 70L46 40L24 70M46 40L84 40L87 50L54 70M87 50L96 70M84 40L82 34L90 33M40 38H52" />
    <line class="rider__crank" data-crank />
    <path class="rider__body" d="M47 36L74 18L82 26L89 33" />
    <circle class="rider__head" cx="80" cy="11" r="6" />
    <path class="rider__helmet" d="M73 10a7 7 0 0 1 14 0z" />
    <polyline class="rider__leg" data-leg="near" />
  </g>`;

// Two-bone IK: knee position for a leg from hip to foot, knee pointing forward
function knee(hip, foot) {
  const dx = foot[0] - hip[0];
  const dy = foot[1] - hip[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), 0.01), THIGH + SHIN - 0.01);
  const ux = dx / d;
  const uy = dy / d;
  const a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(THIGH * THIGH - a * a, 0));
  return [hip[0] + a * ux + h * uy, hip[1] + a * uy - h * ux];
}

function createRider(svg) {
  svg.setAttribute("viewBox", "0 0 120 90");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("rider");
  svg.innerHTML = RIDER_MARKUP;

  const rear = svg.querySelector('[data-wheel="rear"]');
  const front = svg.querySelector('[data-wheel="front"]');
  const crank = svg.querySelector("[data-crank]");
  const legNear = svg.querySelector('[data-leg="near"]');
  const legFar = svg.querySelector('[data-leg="far"]');

  // angle: wheel rotation in degrees; crank: pedal rotation in degrees (geared to the wheels by default)
  function pose(angle, crankAngle = angle * PEDAL_RATIO) {
    rear.setAttribute("transform", `rotate(${angle} ${REAR[0]} ${REAR[1]})`);
    front.setAttribute("transform", `rotate(${angle} ${FRONT[0]} ${FRONT[1]})`);

    const c = (crankAngle * Math.PI) / 180;
    const near = [BB[0] + CRANK * Math.cos(c), BB[1] + CRANK * Math.sin(c)];
    const far = [BB[0] - CRANK * Math.cos(c), BB[1] - CRANK * Math.sin(c)];
    crank.setAttribute("x1", near[0]);
    crank.setAttribute("y1", near[1]);
    crank.setAttribute("x2", far[0]);
    crank.setAttribute("y2", far[1]);

    for (const [leg, foot] of [[legNear, near], [legFar, far]]) {
      const k = knee(HIP, foot);
      leg.setAttribute("points", `${HIP[0]},${HIP[1]} ${k[0]},${k[1]} ${foot[0]},${foot[1]}`);
    }
  }

  pose(0);
  return { pose };
}

// Wheel rotation (degrees) for a distance travelled in px, given the rider's rendered width
function wheelDegrees(distancePx, riderWidthPx) {
  const radiusPx = (WHEEL_R / 120) * riderWidthPx;
  return (distancePx / radiusPx) * (180 / Math.PI);
}

/* ---------- Pages: every `main > section` is a full-screen page (CSS snaps to them) ---------- */

function initPages() {
  const header = document.querySelector("[data-header]");
  const sections = [...document.querySelectorAll("main > section")];
  // Top-level nav links only (sub-menu links point at cards, not pages)
  const navLinks = new Map(
    [...document.querySelectorAll('.site-nav__list > li > a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );

  let tops = []; // scroll position where each page snaps in
  let maxScroll = 1;
  let lastY = -1;
  let active = null;

  function measure() {
    const chrome = header ? header.offsetHeight : 0;
    maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    tops = sections.map((s) => Math.max(s.offsetTop - chrome, 0));
    lastY = -1;
  }

  // Stops are evenly spaced along the road (0→1), one per page, whatever each page's height
  function stops() {
    const n = tops.length;
    return tops.map((_, i) => (n > 1 ? i / (n - 1) : 0));
  }

  // Road position for a scroll position: stop i while page i is snapped in,
  // moving proportionally between stops while scrolling from one page to the next
  function progress(y) {
    const n = tops.length;
    if (n < 2) return Math.min(Math.max(y / maxScroll, 0), 1);
    const ends = tops.map((top) => Math.min(top, maxScroll));
    if (y >= ends[n - 1]) return 1;
    let i = 0;
    while (i < n - 2 && y >= ends[i + 1]) i++;
    const span = Math.max(ends[i + 1] - ends[i], 1);
    return (i + Math.min(Math.max((y - ends[i]) / span, 0), 1)) / (n - 1);
  }

  // Highlight the nav link of the page in view
  function step() {
    const y = window.scrollY;
    if (y === lastY) return;
    lastY = y;

    const probe = y + window.innerHeight * 0.4;
    let link = null;
    for (let i = 0; i < sections.length && tops[i] <= probe; i++) {
      link = navLinks.get(sections[i].id) ?? link;
    }
    if (link !== active) {
      active?.classList.remove("is-active");
      link?.classList.add("is-active");
      active = link;
    }
  }

  // Short name for a page: its data-label, else its nav link text, else its heading
  function label(i) {
    const section = sections[i];
    const text = section.dataset.label ?? navLinks.get(section.id)?.textContent ?? section.querySelector("h1, h2")?.textContent;
    return (text ?? "").trim();
  }

  measure();
  return { measure, step, stops, progress, label, sections };
}

/* ---------- Road rider: rides along the strip under the header, from page stop to page stop ---------- */

function initRoad() {
  const road = document.querySelector("[data-road]");
  if (!road) return null;

  const wrap = road.querySelector("[data-road-rider]");
  const trail = road.querySelector("[data-road-trail]");
  const rider = createRider(wrap.querySelector("svg"));
  let stopEls = [];
  let stopAt = [];

  let roadWidth = 0;
  let riderWidth = 0;
  let x = 0;
  let distance = 0;
  let facing = 1;

  function measure() {
    roadWidth = road.clientWidth;
    riderWidth = wrap.offsetWidth;

    stopAt = pages ? pages.stops() : [];
    // Each stop links to its page. The road is aria-hidden and the nav has the same links,
    // so stops stay out of the tab order.
    while (stopEls.length < stopAt.length) {
      const i = stopEls.length;
      const el = document.createElement("a");
      el.className = "road__stop";
      el.href = `#${pages.sections[i].id}`;
      el.tabIndex = -1;
      el.dataset.label = pages.label(i);
      road.insertBefore(el, wrap);
      stopEls.push(el);
    }
    stopEls.forEach((el, i) => {
      const left = stopAt[i] * (roadWidth - riderWidth) + riderWidth / 2;
      el.style.left = `${left}px`;
      // Keep the hover label on screen near the edges
      el.dataset.align = left < 80 ? "start" : left > roadWidth - 80 ? "end" : "center";
    });
  }

  function target() {
    const progress = pages ? pages.progress(window.scrollY) : 0;
    return { progress, x: progress * (roadWidth - riderWidth) };
  }

  // Returns true while still moving
  function step() {
    const t = target();
    const dx = reduceMotion ? t.x - x : (t.x - x) * 0.14;
    x += dx;
    distance += Math.abs(dx); // unsigned: the mirror flip already reverses visual spin

    // Hysteresis so tiny jitters (iOS bounce) don't flip the rider back and forth
    if (dx > 0.6) facing = 1;
    else if (dx < -0.6) facing = -1;

    wrap.style.transform = `translateX(${x}px) scaleX(${facing})`;
    wrap.classList.toggle("is-fast", !reduceMotion && Math.abs(dx) > 6);
    trail.style.transform = `scaleX(${t.progress})`;
    rider.pose(wheelDegrees(distance, riderWidth));

    const reached = x / Math.max(roadWidth - riderWidth, 1) + 0.002;
    stopEls.forEach((el, i) => el.classList.toggle("is-passed", stopAt[i] <= reached));

    return Math.abs(t.x - x) > 0.3;
  }

  function wheelie(on) {
    wrap.classList.toggle("is-wheelie", on && !reduceMotion);
  }

  measure();
  x = target().x;
  return { step, measure, wheelie };
}

/* ---------- Hero scene: endless countryside drawn on a canvas, never the same twice ---------- */

// Integer → 0..1, always the same for the same (i, seed)
function hash(i, seed) {
  let h = Math.imul(i ^ seed, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae3d);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth random curve (about 0..1): a random height every `spacing` px, joined with
// Catmull-Rom so slopes never jump
function noise(x, spacing, seed) {
  const t = x / spacing;
  const i = Math.floor(t);
  const f = t - i;
  const p0 = hash(i - 1, seed);
  const p1 = hash(i, seed);
  const p2 = hash(i + 1, seed);
  const p3 = hash(i + 2, seed);
  return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Mountain ranges behind the hills, back to front: heights in px above the ground line,
// parallax speed relative to the road, and shade (-: paler than the sky, +: towards navy)
const RANGES = [
  { speed: 0.05, spacing: 300, base: 130, amp: 170, shade: -0.1 },
  { speed: 0.15, spacing: 180, base: 60, amp: 140, shade: 0.3 },
];
const HILLS = { speed: 0.4, spacing: 320, base: 34, amp: 70, shade: 0.5 };
const SIGNS = ["Pico do Gavião", "Serra da Mantiqueira", "Caminho da Fé", "Vinícola", "Santa Clara", "Poços de Caldas"];
const BASE_SPEED = 0.09; // px per ms on the flat
const MAX_TILT = 16; // degrees
const STEP = 8; // px between points of a ridge line

function initHero() {
  const hero = document.querySelector("[data-hero]");
  if (!hero) return null;

  const scene = hero.querySelector(".hero__scene");
  const canvas = hero.querySelector("[data-hero-land]");
  const ctx = canvas.getContext("2d");
  const clouds = [...hero.querySelectorAll("[data-layer]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.layer),
    tile: parseFloat(el.dataset.tile),
  }));
  const content = hero.querySelector("[data-hero-content]");
  const arrow = hero.querySelector(".hero__scroll");
  const riderSvg = hero.querySelector("[data-rider]");
  const rider = createRider(riderSvg);

  // Other cyclists on the road (up to two at once), drawn behind the rider
  const others = [0, 1].map(() => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("hero__rider");
    riderSvg.before(svg);
    return { svg, rider: createRider(svg), mode: "away", x: 0, ratio: 0, wait: 0, distance: 0, crank: Math.random() * 360 };
  });
  let othersWait = 3000 + Math.random() * 6000;

  // Colours from the brand tokens: the sky blue, paler for far ranges and darker towards navy
  // up front. Solid, so the sun sets behind the mountains and trees don't show through hills.
  const css = getComputedStyle(document.documentElement);
  const rgb = (name) => {
    const hex = css.getPropertyValue(name).trim();
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  };
  const navy = rgb("--color-navy");
  const blue = rgb("--color-blue");
  const shade = (a) => {
    const to = a < 0 ? [255, 255, 255] : navy;
    return `rgb(${blue.map((c, i) => Math.round(c + (to[i] - c) * Math.abs(a))).join(" ")})`;
  };
  const YELLOW = css.getPropertyValue("--color-yellow").trim();
  const NAVY = shade(1);
  const HILL = shade(HILLS.shade);
  RANGES.forEach((range) => (range.color = shade(range.shade)));

  // A new landscape on every visit: one random seed per page load, one derived seed per feature
  const seed = (Math.random() * 2 ** 31) | 0;
  const seeds = {};
  ["road", "bump", "mood", "hill", "tree", "treeX", "forest", "kind", "big", "house", "houseX", "fence", "sign", "signX", "signText"].forEach(
    (name, i) => (seeds[name] = seed + (i + 1) * 7919)
  );
  RANGES.forEach((range, i) => (range.seed = seed - (i + 1) * 104729));

  let W = 0; // scene size
  let H = 0;
  let G = 0; // y of the ground line
  let groundPx = 48;
  let riderWidth = 0;
  let size = 1; // landscape scale (smaller on phones)
  let roadLift = 30; // how far the road may climb above the ground line…
  let roadDip = 30; // …and dip below it
  let roadSpacing = 420;
  let arrowRight = 0; // a cyclist rides along only where it stays clear of the scroll arrow
  let phone = false;
  let heroHeight = hero.offsetHeight;
  let visible = true;

  let offset = hash(1, seed) * 1e5; // start somewhere random along the endless road
  let distance = 0;
  const pedals = { crank: 0 };
  let speed = BASE_SPEED;
  let boost = 0;
  let coasting = false;
  let drift = 0; // rider rolls a little ahead downhill and drops back uphill
  let clock = 0;
  let lastScroll = window.scrollY;

  const flocks = [];
  let flockWait = 2500 + Math.random() * 6000;
  const dust = [];

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestTick();
  }).observe(hero);

  /* Heights (px above the ground line) at a world x of each layer */

  function roadHeight(x) {
    const mood = 0.35 + 0.65 * noise(x, 2600, seeds.mood); // gentle stretches between big climbs
    const wave = mood * (1.7 * noise(x, roadSpacing, seeds.road) - 0.85 + 0.3 * noise(x, 130, seeds.bump) - 0.15); // about -1..1
    return ((roadLift - roadDip) + (roadLift + roadDip) * wave) / 2;
  }

  function hillHeight(x) {
    return size * (HILLS.base + HILLS.amp * noise(x, HILLS.spacing, seeds.hill));
  }

  function rangeHeight(range, x) {
    const peaks = 1 - Math.abs(2 * noise(x, range.spacing * 0.35, range.seed) - 1);
    return size * (range.base + range.amp * (0.7 * noise(x, range.spacing, range.seed + 1) + 0.3 * peaks));
  }

  function home() {
    // Right edge at 86% of the scene; on phones at the left, with the open road (and arrow) ahead
    return (phone ? 14 : W * 0.86 - riderWidth) + drift;
  }

  // Slope of the road under a rider whose left edge is at screen x (+ = uphill)
  function slopeAt(left) {
    const rear = offset + left + riderWidth * 0.2;
    const front = offset + left + riderWidth * 0.8;
    return (roadHeight(front) - roadHeight(rear)) / (front - rear);
  }

  // Stand a rider on the road: rear tyre on the ground, tilted with the slope.
  // Other cyclists use the far lane: a bit higher and smaller, so passing reads as behind.
  function place(svg, left, farLane = false) {
    const lift = groundPx + roadHeight(offset + left + riderWidth * 0.2) + (farLane ? 10 * size : 0);
    const deg = clamp((Math.atan(slopeAt(left)) * 180) / Math.PI, -MAX_TILT, MAX_TILT);
    svg.style.transform = `translate(${left}px, ${-lift}px) rotate(${-deg}deg)${farLane ? " scale(0.86)" : ""}`;
  }

  // Pedalling: faster cadence uphill (low gear), feet level and still while coasting downhill
  function pedal(state, ground, slope, isCoasting) {
    if (isCoasting) {
      const level = Math.round(state.crank / 180) * 180;
      state.crank += (level - state.crank) * 0.15;
    } else {
      state.crank += wheelDegrees(ground, riderWidth) * PEDAL_RATIO * (1 + Math.max(slope, 0) * 4);
    }
  }

  function measure() {
    W = scene.clientWidth;
    H = scene.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Resizing clears and reallocates the canvas, so only when the size really changed
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    groundPx = parseFloat(getComputedStyle(hero).getPropertyValue("--scene-ground")) * parseFloat(css.fontSize); // token is in rem
    G = H - groundPx;
    heroHeight = hero.offsetHeight;
    riderWidth = parseFloat(getComputedStyle(riderSvg).width);
    phone = W < 600;
    size = phone ? 0.75 : 1;
    roadSpacing = phone ? 320 : 520;
    // Climb as high as the copy above the rider's column allows; keep some road under the dips
    const box = scene.getBoundingClientRect();
    const column = home() - drift - 50;
    const scrolled = Math.min(window.scrollY, heroHeight) * 0.3; // the copy's scroll drift (see draw)
    const text = document.createRange();
    let copyBottom = 0;
    for (const child of content.children) {
      text.selectNodeContents(child);
      const rect = text.getBoundingClientRect();
      if (rect.right - box.left > column) copyBottom = Math.max(copyBottom, rect.bottom - box.top - scrolled);
    }
    roadLift = clamp(G - riderWidth * 0.75 - copyBottom - 16, 12, phone ? 50 : 80);
    arrowRight = arrow ? arrow.getBoundingClientRect().right - box.left : 0;
    roadDip = groundPx - 18;
    draw();
    fadeContent();
  }

  function onScroll() {
    const delta = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    boost = Math.min(boost + delta * 0.004, 1.2);
  }

  /* ---------- Moving things ---------- */

  // Now and then another cyclist (or a pair) overtakes the rider, gets overtaken, or rides
  // along for a while and then sprints ahead or drops back. ratio: their speed vs the rider's.
  function updateOthers(dt, ground) {
    const along = home() - riderWidth * 1.2 + Math.sin(clock * 0.0006) * riderWidth * 0.12;

    if (others.every((o) => o.mode === "away") && (othersWait -= dt) <= 0) {
      othersWait = 6000 + Math.random() * 12000;
      let mode = ["pass", "pass", "pass", "passed", "along"][Math.floor(Math.random() * 5)];
      if (mode === "along" && along < arrowRight + 8) mode = "pass"; // no room beside the rider here
      const count = mode === "pass" && Math.random() < 0.35 ? 2 : 1;
      const ratio = mode === "pass" ? 1 + Math.random() * 0.8 : -(0.6 + Math.random() * 0.25);
      others.slice(0, count).forEach((o, i) => {
        o.mode = mode;
        o.ratio = ratio;
        o.x = mode === "passed" ? W + riderWidth * 0.1 : -riderWidth * (1.3 + i * 1.25);
        o.wait = 8000 + Math.random() * 9000;
        o.svg.dataset.look = Math.random() < 0.5 ? "a" : "b";
      });
    }

    for (const o of others) {
      if (o.mode === "away") continue;
      const before = o.x;
      if (o.mode === "along") {
        o.x += (along - o.x) * Math.min(dt * 0.0007, 1);
        if ((o.wait -= dt) <= 0) {
          o.mode = Math.random() < 0.5 ? "pass" : "passed";
          o.ratio = o.mode === "pass" ? 1 + Math.random() * 0.6 : -(0.6 + Math.random() * 0.2);
        }
      } else {
        o.x += o.ratio * (speed + boost) * dt;
      }
      const moved = Math.max(ground + o.x - before, 0);
      o.distance += moved;
      const slope = slopeAt(o.x);
      pedal(o, moved, slope, slope < -0.06 && o.ratio < 0);
      if (o.x > W + riderWidth * 0.3 || o.x < -riderWidth * 3) o.mode = "away";
    }
  }

  function updateFlocks(dt, ground) {
    if ((flockWait -= dt) <= 0) {
      flockWait = 7000 + Math.random() * 12000;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const count = 2 + Math.floor(Math.random() * 4);
      flocks.push({
        x: dir > 0 ? -60 : W + 60,
        y: H * (0.08 + Math.random() * 0.3),
        vx: dir * (0.035 + Math.random() * 0.03),
        birds: Array.from({ length: count }, (_, i) => ({
          dx: -dir * Math.ceil(i / 2) * (14 + Math.random() * 6),
          dy: (i % 2 ? -1 : 1) * Math.ceil(i / 2) * (6 + Math.random() * 4),
          size: 5 + Math.random() * 3,
          phase: Math.random() * Math.PI * 2,
        })),
      });
    }
    for (let i = flocks.length - 1; i >= 0; i--) {
      const flock = flocks[i];
      flock.x += flock.vx * dt - ground * 0.08;
      if (flock.x < -150 || flock.x > W + 150) flocks.splice(i, 1);
    }
  }

  function updateDust(dt, ground) {
    const left = home();
    if (speed + boost > BASE_SPEED * 1.3 && dust.length < 40 && Math.random() < dt * 0.04) {
      const x = left + riderWidth * 0.2;
      dust.push({ x: x - 4, y: G - roadHeight(offset + x) - 2, age: 0, r: 1.5 + Math.random() * 1.5 });
    }
    for (let i = dust.length - 1; i >= 0; i--) {
      const puff = dust[i];
      puff.age += dt;
      puff.x -= ground;
      puff.y -= dt * 0.012;
      if (puff.age > 700) dust.splice(i, 1);
    }
  }

  // Content drifts up and fades as the hero scrolls away
  function fadeContent() {
    const y = Math.min(window.scrollY, heroHeight);
    content.style.transform = `translateY(${y * 0.3}px)`;
    content.style.opacity = String(1 - Math.min(y / (heroHeight * 0.8), 1));
  }

  function step(dt) {
    fadeContent();
    if (!visible || hero.dataset.video) return false; // the hero video is on instead of the scene
    clock += dt;

    boost *= Math.pow(0.996, dt); // ease back to cruising speed
    const slope = slopeAt(home());
    const want = BASE_SPEED * clamp(1 - slope * 2.5, 0.5, 1.7); // slower uphill, faster downhill
    speed += (want - speed) * Math.min(dt * 0.002, 1);
    const ground = (speed + boost) * dt;
    offset += ground;
    distance += ground;

    coasting = boost < 0.1 && slope < (coasting ? -0.02 : -0.08);
    pedal(pedals, ground, slope, coasting);
    const reach = phone ? 8 : 40; // phones: keep clear of the arrow
    drift += (clamp(((speed - BASE_SPEED) / BASE_SPEED) * 45, -reach * 0.75, reach) - drift) * Math.min(dt * 0.001, 1);

    updateOthers(dt, ground);
    updateFlocks(dt, ground);
    updateDust(dt, ground);
    draw();
    return true;
  }

  /* ---------- Drawing ---------- */

  // Fill everything below a height line that scrolls at `speed`
  function fillLayer(heightAt, layerSpeed, color) {
    const shift = offset * layerSpeed;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + STEP; x += STEP) ctx.lineTo(x, G - heightAt(shift + x));
    ctx.lineTo(W + STEP, H);
    ctx.fill();
  }

  // Each slot of `slot` px (in a layer's world x) may hold one prop, decided by hashes
  function eachSlot(shift, slot, margin, draw) {
    for (let k = Math.floor((shift - margin) / slot); k * slot < shift + W + margin; k++) draw(k);
  }

  function araucaria(x, y, s) {
    ctx.fillRect(x - s * 0.035, y - s, s * 0.07, s);
    for (const [dy, half] of [[0, 0.42], [0.15, 0.34], [0.28, 0.2]]) {
      ctx.beginPath();
      ctx.ellipse(x, y - s + dy * s, half * s, 0.08 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pine(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.28, y - s * 0.1);
    ctx.lineTo(x - s * 0.28, y - s * 0.1);
    ctx.fill();
    ctx.fillRect(x - s * 0.04, y - s * 0.15, s * 0.08, s * 0.15);
  }

  function bush(x, y, s) {
    ctx.fillRect(x - s * 0.05, y - s * 0.5, s * 0.1, s * 0.5);
    ctx.beginPath();
    ctx.arc(x, y - s * 0.62, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }

  function farmhouse(x, y, s, lit) {
    const w = 26 * s;
    const h = 14 * s;
    ctx.fillStyle = HILL;
    ctx.fillRect(x - w / 2, y - h, w, h);
    ctx.fillRect(x + w * 0.2, y - h - 9 * s, 3 * s, 8 * s); // chimney
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 3 * s, y - h + 1);
    ctx.lineTo(x, y - h - 10 * s);
    ctx.lineTo(x + w / 2 + 3 * s, y - h + 1);
    ctx.fill();
    ctx.fillStyle = YELLOW;
    ctx.fillRect(x - w * 0.3, y - h * 0.68, 4 * s, 4 * s);
    if (lit) ctx.fillRect(x + w * 0.12, y - h * 0.68, 4 * s, 4 * s);
  }

  // Groves of araucárias, pines and round trees on the hills, a farmhouse here and there
  function drawHillProps() {
    const shift = offset * HILLS.speed;
    ctx.fillStyle = HILL;
    eachSlot(shift, 34, 40, (k) => {
      const wx = k * 34 + hash(k, seeds.treeX) * 34;
      if (hash(k, seeds.tree) > 0.1 + noise(wx, 600, seeds.forest) * 0.8) return; // groves and open fields
      const x = wx - shift;
      const y = G - hillHeight(wx) + 2;
      const kind = hash(k, seeds.kind);
      const big = size * (0.7 + 0.6 * hash(k, seeds.big));
      if (kind < 0.5) araucaria(x, y, 36 * big);
      else if (kind < 0.8) pine(x, y, 26 * big);
      else bush(x, y, 20 * big);
    });
    eachSlot(shift, 380, 60, (k) => {
      if (hash(k, seeds.house) > 0.3) return;
      const wx = k * 380 + 40 + hash(k, seeds.houseX) * 300;
      farmhouse(wx - shift, G - hillHeight(wx) + 2, size, hash(k, seeds.big) < 0.5);
    });
  }

  // The road the rider is on: rolling surface, a lighter edge and yellow dashes that move with it
  function drawRoad() {
    fillLayer(roadHeight, 1, NAVY);
    const surface = (x) => G - roadHeight(offset + x);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgb(255 255 255 / 0.22)";
    ctx.beginPath();
    for (let x = 0; x <= W + STEP; x += STEP) ctx.lineTo(x, surface(x) + 1);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = YELLOW;
    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = offset % 80; // dashes stay put on the road
    ctx.beginPath();
    for (let x = 0; x <= W + STEP; x += STEP) ctx.lineTo(x, surface(x) + 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Fence runs and trail signs pointing to the tours, along the road
  function drawRoadside() {
    ctx.fillStyle = ctx.strokeStyle = "rgb(255 255 255 / 0.3)";
    ctx.lineWidth = 1.5;
    eachSlot(offset, 26, 30, (k) => {
      const wx = k * 26;
      if (noise(wx, 1500, seeds.fence) < 0.7) return;
      const x = wx - offset;
      const y = G - roadHeight(wx);
      ctx.fillRect(x - 1.1, y - 12 * size, 2.2, 12 * size + 2);
      if (noise(wx + 26, 1500, seeds.fence) < 0.7) return;
      const y2 = G - roadHeight(wx + 26);
      ctx.beginPath();
      for (const h of [9, 4]) {
        ctx.moveTo(x, y - h * size);
        ctx.lineTo(x + 26, y2 - h * size);
      }
      ctx.stroke();
    });

    ctx.font = `600 ${Math.round(10 * size)}px Poppins, sans-serif`;
    ctx.textBaseline = "middle";
    eachSlot(offset, 1200, 200, (k) => {
      if (hash(k, seeds.sign) > 0.45) return;
      const wx = k * 1200 + hash(k, seeds.signX) * 600;
      const x = wx - offset;
      const y = G - roadHeight(wx);
      const text = SIGNS[Math.floor(hash(k, seeds.signText) * SIGNS.length)];
      const post = 30 * size;
      const bh = 16 * size;
      const bw = ctx.measureText(text).width + 12 * size;
      const top = y - post - bh + 4;
      ctx.fillStyle = "rgb(255 255 255 / 0.55)";
      ctx.fillRect(x - 1.25, y - post, 2.5, post + 2);
      ctx.fillStyle = YELLOW;
      ctx.beginPath();
      ctx.moveTo(x - 5, top);
      ctx.lineTo(x - 5 + bw, top);
      ctx.lineTo(x - 5 + bw + 6 * size, top + bh / 2);
      ctx.lineTo(x - 5 + bw, top + bh);
      ctx.lineTo(x - 5, top + bh);
      ctx.fill();
      ctx.fillStyle = NAVY;
      ctx.fillText(text, x - 5 + 6 * size, top + bh / 2 + 0.5);
    });
  }

  function drawFlocks() {
    ctx.strokeStyle = "rgb(255 255 255 / 0.75)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const flock of flocks) {
      for (const bird of flock.birds) {
        const x = flock.x + bird.dx;
        const y = flock.y + bird.dy;
        const s = bird.size;
        const wing = Math.sin(clock * 0.016 + bird.phase) * s * 0.7; // flapping
        ctx.moveTo(x - s, y - wing);
        ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.3, x, y);
        ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.3, x + s, y - wing);
      }
    }
    ctx.stroke();
  }

  function drawDust() {
    for (const puff of dust) {
      const t = puff.age / 700;
      ctx.fillStyle = `rgb(255 255 255 / ${0.3 * (1 - t)})`;
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.r * (1 + t * 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const range of RANGES) fillLayer((x) => rangeHeight(range, x), range.speed, range.color);
    drawFlocks();
    fillLayer(hillHeight, HILLS.speed, HILL);
    drawHillProps();
    drawRoad();
    drawRoadside();
    drawDust();

    for (const cloud of clouds) {
      cloud.el.style.transform = `translateX(${-((offset * cloud.speed) % cloud.tile)}px)`;
    }

    place(riderSvg, home());
    rider.pose(wheelDegrees(distance, riderWidth), pedals.crank);
    for (const o of others) {
      o.svg.style.visibility = o.mode === "away" ? "hidden" : "";
      if (o.mode === "away") continue;
      place(o.svg, o.x, true);
      o.rider.pose(wheelDegrees(o.distance, riderWidth), o.crank);
    }
  }

  measure(); // first frame, also the only one with reduced motion
  return { step, measure, onScroll };
}

/* ---------- Hero video: replaces the scene if it can play within 5 s, else the scene runs ---------- */

const VIDEO_WAIT = 5000; // ms

function initHeroVideo() {
  const heroEl = document.querySelector("[data-hero]");
  const video = heroEl?.querySelector("[data-hero-video]");
  if (!video) return;
  const film = video.parentElement;
  // Reduced motion or data saver: keep the (still) scene and don't download the video
  if (reduceMotion || navigator.connection?.saveData) {
    film.remove();
    return;
  }

  heroEl.dataset.video = "loading"; // the poster shows meanwhile (CSS)
  hero?.measure(); // the copy is laid out differently over the video
  const giveUp = () => {
    if (heroEl.dataset.video !== "loading") return;
    delete heroEl.dataset.video;
    video.querySelectorAll("source").forEach((source) => source.remove());
    video.load(); // stops the download
    film.remove();
    hero?.measure();
    requestTick(); // start the scene
  };
  const timer = setTimeout(giveUp, VIDEO_WAIT);

  video.addEventListener("playing", () => {
    if (heroEl.dataset.video !== "loading") return;
    clearTimeout(timer);
    heroEl.dataset.video = "playing";
  });
  video.querySelector("source")?.addEventListener("error", giveUp);
  video.muted = true;
  video.preload = "auto";
  video.play().catch(giveUp); // autoplay blocked (e.g. iOS Low Power Mode)

  // Pause while the hero is scrolled away
  new IntersectionObserver(([entry]) => {
    if (heroEl.dataset.video !== "playing") return;
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }).observe(heroEl);
}

/* ---------- Animation loop (runs only while something is moving) ---------- */

let pages = null;
let road = null;
let hero = null;
let ticking = false;
let lastTime = 0;

function tick(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  pages?.step();
  const roadMoving = road ? road.step() : false;
  const heroMoving = hero && !reduceMotion && !document.hidden ? hero.step(dt) : false;

  if (roadMoving || heroMoving) {
    requestAnimationFrame(tick);
  } else {
    ticking = false;
  }
}

function requestTick() {
  if (ticking) return;
  ticking = true;
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

/* ---------- Reveal: content fades up as each page arrives ---------- */

const REVEAL_SELECTOR = [
  ".section__header",
  ".trust__item",
  ".card",
  ".value",
  ".faq__item",
  ".split > *",
  ".contact > *",
].join(",");

// Hidden state lives in the CSS (keyed off html.js); this only adds .is-visible.
function initReveal() {
  const items = document.querySelectorAll(REVEAL_SELECTOR);
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => {
    // Stagger siblings (cards in a grid, steps, etc.)
    const index = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 90}ms`);
    observer.observe(el);
  });
}

/* ---------- Link clicks: wheelie on the way, heading swoosh on arrival ---------- */

function onScrollEnd(callback) {
  let done = false;
  let idle;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(idle);
    clearTimeout(cap);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("scrollend", finish);
    callback();
  };
  // Fallback for browsers without `scrollend`: ~150ms with no scroll events
  const onScroll = () => {
    clearTimeout(idle);
    idle = setTimeout(finish, 150);
  };
  const cap = setTimeout(finish, 2500); // already at target → no scroll events at all

  if ("onscrollend" in window) window.addEventListener("scrollend", finish);
  window.addEventListener("scroll", onScroll, { passive: true });
  idle = setTimeout(finish, 300);
}

// Target can be a page (section) or a card inside one (sub-menu links)
function arrive(target) {
  const heading = target.matches("h1, h2, h3") ? target : target.querySelector("h1, h2, h3");
  if (!heading || reduceMotion) return;
  heading.classList.remove("is-arriving");
  void heading.offsetWidth; // restart the animation
  heading.classList.add("is-arriving");
}

function initAnchorLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute("href");
    const section = hash.length > 1 ? document.querySelector(hash) : null;
    if (!section) return;

    road?.wheelie(true);
    requestTick();
    onScrollEnd(() => {
      road?.wheelie(false);
      arrive(section);
    });
  });
}

/* ---------- Button ripple ---------- */

function initRipple() {
  if (reduceMotion) return;
  document.addEventListener("pointerdown", (event) => {
    const btn = event.target.closest(".btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    ripple.addEventListener("animationend", () => ripple.remove());
    btn.append(ripple);
  });
}

/* ---------- Boot ---------- */

pages = initPages();
road = initRoad();
hero = initHero();
initHeroVideo();
initReveal();
initAnchorLinks();
initRipple();

window.addEventListener(
  "scroll",
  () => {
    hero?.onScroll();
    requestTick();
  },
  { passive: true }
);

const remeasure = () => {
  pages?.measure();
  road?.measure();
  hero?.measure();
  requestTick();
};
window.addEventListener("resize", remeasure);
window.addEventListener("load", remeasure);
document.addEventListener("visibilitychange", requestTick);
new ResizeObserver(remeasure).observe(document.body);

requestTick();
