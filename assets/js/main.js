// LocBike — main script

// Single place to set the WhatsApp contact. Digits only: country + area code + number.
const WHATSAPP_NUMBER = "5535997790123"; // (35) 9 9779-0123
const WHATSAPP_MESSAGE = "Olá! Gostaria de saber mais sobre os passeios da LocBike.";

// The page's text in the current language (things18n, assets/js/i18n-en.js); as written when the
// library didn't load or has no translation
const tr = (text) => (window.things18n?.has(text) ? things18n.t(text) : text);

// Point every [data-whatsapp] link at the configured number. The prefilled message is
// WHATSAPP_MESSAGE, or the attribute's own value (e.g. data-whatsapp="Quero um vale-presente").
// Rebuilt when the language changes: things18n translates the attribute, this follows it.
function initWhatsAppLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    const message = link.dataset.whatsapp || tr(WHATSAPP_MESSAGE);
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
// the ×, a backdrop click or Escape close it. A dialog can have more than one opener (the Noturno
// teaser on Roteiros Bike opens its card's dialog too), so each dialog is wired once.
function initTourDialogs() {
  const wired = new Set();
  document.querySelectorAll("[data-dialog-open]").forEach((button) => {
    const dialog = document.getElementById(button.dataset.dialogOpen);
    if (!dialog) return;
    const card = button.closest(".card");

    button.addEventListener("click", () => openDialog(dialog));

    // The button stays the keyboard target; the rest of the card is a bigger pointer target.
    // Skip clicks on other controls, inside the dialog (it lives in the card), or that end a text selection.
    if (card) {
      card.classList.add("card--clickable");
      warmOnApproach(card, dialog);
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button, dialog") || String(window.getSelection())) return;
        openDialog(dialog);
      });
    }
    if (wired.has(dialog)) return;
    wired.add(dialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-dialog-close]")) closeDialog(dialog);
    });
    // Escape: fade out too, unless the browser won't let the close be held back
    dialog.addEventListener("cancel", (event) => {
      if (!event.cancelable) return;
      event.preventDefault();
      closeDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      dialog.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
}

// The dialog fades in with a slight zoom and fades out on close; with reduced motion it just opens
const DIALOG_OPEN_MS = 220;
const DIALOG_CLOSE_MS = 160;
const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)");

function fade(dialog, opening) {
  const options = { duration: opening ? DIALOG_OPEN_MS : DIALOG_CLOSE_MS, easing: opening ? "ease-out" : "ease-in", fill: "forwards" };
  const frames = [
    { opacity: 0, transform: "scale(0.96)" },
    { opacity: 1, transform: "none" },
  ];
  const box = dialog.animate(opening ? frames : frames.reverse(), options);
  dialog.animate({ opacity: opening ? [0, 1] : [1, 0] }, { ...options, pseudoElement: "::backdrop" });
  return box.finished;
}

function openDialog(dialog) {
  if (dialog.open) return;
  dialog.showModal();
  dialog.focus(); // the dialog itself, so neither the close button nor the photo strip opens focused
  if (!prefersStill.matches) fade(dialog, true).then(() => dialog.getAnimations().forEach((animation) => animation.cancel()));
}

function closeDialog(dialog) {
  if (!dialog.open || dialog.dataset.closing !== undefined) return;
  if (prefersStill.matches) return dialog.close();
  dialog.dataset.closing = "";
  const done = () => {
    delete dialog.dataset.closing;
    dialog.close();
    dialog.getAnimations().forEach((animation) => animation.cancel());
  };
  fade(dialog, false).then(done, done);
}

// The first photo is lazy and its dialog is closed, so it wouldn't load until the dialog opens and
// would pop in late. Load and decode it ahead: when its card comes near the screen, or is pointed
// at, touched or focused.
function warmFirstPhoto(dialog) {
  const img = dialog.querySelector(".tour-gallery img");
  if (img && img.loading !== "eager") {
    img.loading = "eager";
    img.decode().catch(() => {});
  }
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

// While a dialog is open the page behind stays put. Not with overflow: hidden on <html>: that drops the
// page's scrollbar on the spot, a flash at the window's edge on macOS. Instead, scrolling that would
// reach the page is ignored; the dialog's text column and photo strip still scroll (their
// overscroll-behavior keeps them from spilling over onto the page).
const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);
let touchStart = null;

// Sideways: along the photo strip, not down the page
function sideways(event) {
  if (event.type === "wheel") return Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const touch = event.touches[0];
  return touchStart && Math.abs(touch.clientX - touchStart.x) > Math.abs(touch.clientY - touchStart.y);
}

function holdPage(event) {
  if (!document.querySelector(".tour-dialog[open]")) return;
  const target = event.target instanceof Element ? event.target : null;
  if (event.type === "keydown") {
    if (!SCROLL_KEYS.has(event.key) || target?.closest("a, button, input, select, textarea")) return;
  } else if (target?.closest(".tour-dialog__body")) {
    return;
  } else if (target?.closest(".tour-gallery__track") && sideways(event)) {
    return;
  }
  event.preventDefault();
}

document.addEventListener("touchstart", (event) => (touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY }), { passive: true });
for (const type of ["wheel", "touchmove", "keydown"]) document.addEventListener(type, holdPage, { passive: false });

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
window.things18n?.ready(initWhatsAppLinks);
document.addEventListener("things18n:change", initWhatsAppLinks);
initNav();
initTourDialogs();
initGalleries();
initFooterYear();
