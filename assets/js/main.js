// LocBike — main script

// Single place to set the WhatsApp contact. Digits only: country + area code + number.
const WHATSAPP_NUMBER = "5535997790123"; // (35) 9 9779-0123
const WHATSAPP_MESSAGE = "Olá! Gostaria de saber mais sobre os passeios da LocBike.";

// Point every [data-whatsapp] link at the configured number. The prefilled message is
// WHATSAPP_MESSAGE, or the attribute's own value (e.g. data-whatsapp="Quero um vale-presente").
function initWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    const message = link.dataset.whatsapp || WHATSAPP_MESSAGE;
    link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    link.target = "_blank";
    link.rel = "noopener";
  });
}

// Mobile nav: toggle open/closed, close on link click or Escape
function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      setOpen(false);
      link.blur(); // lets a desktop sub-menu (opened by :focus-within) close after the jump
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

// Tour details: "Ver detalhes" or a click anywhere on its card opens the tour's <dialog>;
// the ×, a backdrop click or Escape close it
function initTourDialogs() {
  document.querySelectorAll("[data-dialog-open]").forEach((button) => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (!dialog) return;
    const card = button.closest(".card");

    button.addEventListener("click", () => openDialog(dialog, card));

    // The button stays the keyboard target; the rest of the card is a bigger pointer target.
    // Skip clicks on other controls, inside the dialog (it lives in the card), or that end a text selection.
    if (card) {
      card.classList.add("card--clickable");
      warmOnApproach(card, dialog);
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button, dialog") || String(window.getSelection())) return;
        openDialog(dialog, card);
      });
    }
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-dialog-close]")) closeDialog(dialog, card);
    });
    // Escape: animate too, unless the browser won't let the close be held back
    dialog.addEventListener("cancel", (event) => {
      if (!event.cancelable) return;
      event.preventDefault();
      closeDialog(dialog, card);
    });
    dialog.addEventListener("close", () => {
      dialog.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
}

// The card and its dialog are one thing that grows and shrinks: a View Transition morphs the card's
// box, photo and title into the dialog's while their contents cross-fade. Timing lives here and
// reaches the CSS as --morph-ms / --morph-easing; without View Transitions (or with reduced motion)
// it just opens. The easing starts gently so a slow first frame doesn't read as a jump.
const MORPH_OPEN_MS = 420;
const MORPH_CLOSE_MS = 320;
const MORPH_EASING = "cubic-bezier(0.3, 0, 0, 1)";
const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)");
let morphing = false;

function openDialog(dialog, card) {
  if (dialog.open || morphing) return;
  const show = () => {
    dialog.showModal();
    dialog.focus(); // the dialog itself, so neither the close button nor the photo strip opens focused
  };
  if (!card || prefersStill.matches || !document.startViewTransition) return show();
  morph(dialog, card, true, () => {
    show();
    // On open the page behind isn't cross-faded (see the CSS), so the real backdrop blur fades in live
    dialog.animate({ opacity: [0, 1] }, { duration: MORPH_OPEN_MS, easing: MORPH_EASING, pseudoElement: "::backdrop" });
    return firstPhotoReady(dialog);
  });
}

function closeDialog(dialog, card) {
  if (!dialog.open || morphing) return;
  if (!card || prefersStill.matches || !document.startViewTransition) return dialog.close();
  morph(dialog, card, false, () => dialog.close());
}

// [name, card part, dialog part]; a pair is skipped when either side is missing
function morphParts(dialog, card) {
  return [
    ["tour-box", card, dialog],
    ["tour-media", card.querySelector(".card__media"), dialog.querySelector(".tour-gallery")],
    ["tour-title", card.querySelector(".card__title"), dialog.querySelector("h3")],
  ].filter(([, cardPart, dialogPart]) => cardPart && dialogPart);
}

// Names one side only: a name must be unique when the page is captured, and the dialog sits inside the card
function nameParts(parts, side) {
  for (const [name, cardPart, dialogPart] of parts) {
    cardPart.style.viewTransitionName = side === "card" ? name : "";
    dialogPart.style.viewTransitionName = side === "dialog" ? name : "";
  }
}

// A part's snapshot loses the rounded clip of the box it sits in, so its corners are animated
// instead: a part gets the box's radius on each corner it touches, square elsewhere. The box's
// corners and shadow go on its group, which is solid and clips; the photo's on its image pair.
const CORNERS = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"];

function cornerRadii(part, box) {
  const p = part.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const style = getComputedStyle(box);
  const near = (a, c) => Math.abs(a - c) < 8; // loose: a hovered card is slightly rotated
  const touches = {
    TopLeft: near(p.top, b.top) && near(p.left, b.left),
    TopRight: near(p.top, b.top) && near(p.right, b.right),
    BottomRight: near(p.bottom, b.bottom) && near(p.right, b.right),
    BottomLeft: near(p.bottom, b.bottom) && near(p.left, b.left),
  };
  return Object.fromEntries(
    CORNERS.map((corner) => [`border${corner}Radius`, touches[corner] ? style[`border${corner}Radius`] : "0px"])
  );
}

function morphFrame(name, part, box) {
  const frame = cornerRadii(part, box);
  if (name === "tour-box") frame.boxShadow = getComputedStyle(box).boxShadow;
  return frame;
}

function morph(dialog, card, opening, update) {
  const parts = morphParts(dialog, card);
  const rounded = parts.filter(([name]) => name !== "tour-title"); // the title isn't clipped by a corner
  const ms = opening ? MORPH_OPEN_MS : MORPH_CLOSE_MS;
  const root = document.documentElement;
  const frames = (side) =>
    rounded.map(([name, cardPart, dialogPart]) =>
      side === "card" ? morphFrame(name, cardPart, card) : morphFrame(name, dialogPart, dialog)
    );

  morphing = true;
  root.dataset.morph = opening ? "open" : "close";
  root.style.setProperty("--morph-ms", `${ms}ms`);
  root.style.setProperty("--morph-easing", MORPH_EASING);
  nameParts(parts, opening ? "card" : "dialog");
  const from = frames(opening ? "card" : "dialog");
  let to;

  const transition = document.startViewTransition(async () => {
    nameParts(parts, opening ? "dialog" : "card");
    await update();
    to = frames(opening ? "dialog" : "card");
  });

  transition.ready
    .then(() => {
      rounded.forEach(([name], i) => {
        root.animate([from[i], to[i]], {
          duration: ms,
          easing: MORPH_EASING,
          pseudoElement: name === "tour-box" ? "::view-transition-group(tour-box)" : `::view-transition-image-pair(${name})`,
        });
      });
    })
    .catch(() => {});

  transition.finished
    .catch(() => {})
    .then(() => {
      nameParts(parts, null);
      delete root.dataset.morph;
      root.style.removeProperty("--morph-ms");
      root.style.removeProperty("--morph-easing");
      morphing = false;
    });
}

// The first photo is lazy and its dialog is closed, so it wouldn't load until the dialog opens and
// would then pop in mid-morph (or hold the morph back). Load and decode it ahead: when its card
// comes near the screen, or is pointed at, touched or focused.
function warmFirstPhoto(dialog) {
  const img = dialog.querySelector(".tour-gallery img");
  if (img && img.loading !== "eager") {
    img.loading = "eager";
    img.decode().catch(() => {});
  }
  return img;
}

function warmOnApproach(card, dialog) {
  const warm = () => warmFirstPhoto(dialog);
  for (const type of ["pointerenter", "pointerdown", "focusin"]) card.addEventListener(type, warm, { once: true });
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      warm();
      observer.disconnect();
    },
    { rootMargin: "50% 0px" }
  );
  observer.observe(card);
}

// Last resort when it still isn't ready: wait a moment, but never hold the morph back for long
function firstPhotoReady(dialog) {
  const img = warmFirstPhoto(dialog);
  if (!img || img.complete) return;
  return Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 100))]);
}

// Photo strips inside the dialogs: arrow buttons step one photo at a time
function initGalleries() {
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const track = gallery.querySelector("[data-gallery-track]");
    const step = (direction) => track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    gallery.querySelector("[data-gallery-prev]").addEventListener("click", () => step(-1));
    gallery.querySelector("[data-gallery-next]").addEventListener("click", () => step(1));
  });
}

function initFooterYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

initWhatsAppLinks();
initNav();
initTourDialogs();
initGalleries();
initFooterYear();
