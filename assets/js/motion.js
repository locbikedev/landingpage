// Locbike — motion: scroll-driven riders, reveals, link/click effects.
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

  // angle: wheel rotation in degrees
  function pose(angle) {
    rear.setAttribute("transform", `rotate(${angle} ${REAR[0]} ${REAR[1]})`);
    front.setAttribute("transform", `rotate(${angle} ${FRONT[0]} ${FRONT[1]})`);

    const c = (angle * PEDAL_RATIO * Math.PI) / 180;
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

/* ---------- Road rider: rides along the strip under the header with page progress ---------- */

function initRoad() {
  const road = document.querySelector("[data-road]");
  if (!road) return null;

  const wrap = road.querySelector("[data-road-rider]");
  const trail = road.querySelector("[data-road-trail]");
  const rider = createRider(wrap.querySelector("svg"));

  let roadWidth = 0;
  let riderWidth = 0;
  let maxScroll = 1;
  let x = 0;
  let distance = 0;
  let facing = 1;

  function measure() {
    roadWidth = road.clientWidth;
    riderWidth = wrap.offsetWidth;
    maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  }

  function target() {
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
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

    return Math.abs(t.x - x) > 0.3;
  }

  function wheelie(on) {
    wrap.classList.toggle("is-wheelie", on && !reduceMotion);
  }

  measure();
  x = target().x;
  return { step, measure, wheelie };
}

/* ---------- Hero scene: endless landscape, rider pedals faster when you scroll ---------- */

function initHero() {
  const hero = document.querySelector("[data-hero]");
  if (!hero) return null;

  const layers = [...hero.querySelectorAll("[data-layer]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.layer),
    tile: parseFloat(el.dataset.tile),
  }));
  const content = hero.querySelector("[data-hero-content]");
  const riderSvg = hero.querySelector("[data-rider]");
  const rider = createRider(riderSvg);

  const BASE_SPEED = 0.09; // px per ms at ground level
  let offset = 0;
  let boost = 0;
  let lastScroll = window.scrollY;
  let heroHeight = hero.offsetHeight;
  let riderWidth = riderSvg.getBoundingClientRect().width;
  let visible = true;

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) requestTick();
  }).observe(hero);

  function measure() {
    heroHeight = hero.offsetHeight;
    riderWidth = riderSvg.getBoundingClientRect().width;
  }

  function onScroll() {
    const delta = Math.abs(window.scrollY - lastScroll);
    lastScroll = window.scrollY;
    boost = Math.min(boost + delta * 0.004, 1.2);
  }

  function step(dt) {
    if (!visible) return false;

    boost *= Math.pow(0.996, dt); // ease back to cruising speed
    const ground = (BASE_SPEED + boost) * dt;
    offset += ground;

    for (const layer of layers) {
      const shift = (offset * layer.speed) % layer.tile;
      layer.el.style.transform = `translateX(${-shift}px)`;
    }
    rider.pose(wheelDegrees(offset, riderWidth));

    // Content drifts up and fades as the hero scrolls away
    const y = Math.min(window.scrollY, heroHeight);
    content.style.transform = `translateY(${y * 0.3}px)`;
    content.style.opacity = String(1 - Math.min(y / (heroHeight * 0.8), 1));

    return true;
  }

  return { step, measure, onScroll };
}

/* ---------- Animation loop (runs only while something is moving) ---------- */

let road = null;
let hero = null;
let ticking = false;
let lastTime = 0;

function tick(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

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

/* ---------- Reveal on scroll ---------- */

const REVEAL_SELECTOR = [
  ".section__header",
  ".trust__item",
  ".card",
  ".step",
  ".value",
  ".faq__item",
  ".featured__inner > *",
  ".about > *",
  ".contact > *",
  ".voucher > *",
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
  const cap = setTimeout(finish, 2000); // already at target → no scroll events at all

  if ("onscrollend" in window) window.addEventListener("scrollend", finish);
  window.addEventListener("scroll", onScroll, { passive: true });
  idle = setTimeout(finish, 300);
}

function arrive(section) {
  const heading = section.querySelector("h1, h2");
  if (!heading || reduceMotion) return;
  heading.classList.remove("is-arriving");
  void heading.offsetWidth; // restart the animation
  heading.classList.add("is-arriving");
}

function initAnchorLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const section = document.querySelector(link.getAttribute("href"));
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

/* ---------- Scrollspy: highlight the nav link of the section in view ---------- */

function initScrollSpy() {
  const links = new Map(
    [...document.querySelectorAll('.site-nav__list a[href^="#"]')].map((a) => [a.getAttribute("href").slice(1), a])
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        links.forEach((a) => a.classList.remove("is-active"));
        links.get(entry.target.id)?.classList.add("is-active");
      }
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
}

/* ---------- Boot ---------- */

road = initRoad();
hero = initHero();
initReveal();
initAnchorLinks();
initRipple();
initScrollSpy();

window.addEventListener(
  "scroll",
  () => {
    hero?.onScroll();
    requestTick();
  },
  { passive: true }
);

const remeasure = () => {
  road?.measure();
  hero?.measure();
  requestTick();
};
window.addEventListener("resize", remeasure);
document.addEventListener("visibilitychange", requestTick);
window.addEventListener("load", remeasure);
new ResizeObserver(remeasure).observe(document.body);

requestTick();
