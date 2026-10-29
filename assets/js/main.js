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
      dialog.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
      dialog.querySelectorAll("video").forEach((video) => video.pause());
    });
  });
}

// The card grows into the dialog: the dialog box starts on top of the card (same spot, size and
// corners) and expands to its place, then its contents fade in. Closing runs it backwards.
// Corners are counter-scaled so they stay round while the box is stretched.
const DIALOG_OPEN_MS = 480;
const DIALOG_CLOSE_MS = 360;
const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)");

function cardKeyframes(dialog, card) {
  const from = card.getBoundingClientRect();
  const to = dialog.getBoundingClientRect();
  const sx = from.width / to.width;
  const sy = from.height / to.height;
  const cardStyle = getComputedStyle(card);
  const corner = (side) => {
    const [rx, ry = rx] = cardStyle[`border${side}Radius`].split(" ").map(parseFloat);
    return `${rx / sx}px ${ry / sy}px`;
  };
  return [
    {
      transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`,
      borderTopLeftRadius: corner("TopLeft"),
      borderTopRightRadius: corner("TopRight"),
      borderBottomRightRadius: corner("BottomRight"),
      borderBottomLeftRadius: corner("BottomLeft"),
    },
    { transform: "none", borderRadius: getComputedStyle(dialog).borderRadius },
  ];
}

function openDialog(dialog, card) {
  if (dialog.open) return;
  dialog.showModal();
  dialog.focus(); // the dialog itself, so neither the close button nor the photo strip opens focused
  if (!card || prefersStill.matches) return;

  const box = { duration: DIALOG_OPEN_MS, easing: "cubic-bezier(0.3, 0.9, 0.25, 1)" };
  dialog.style.transformOrigin = "0 0";
  dialog.animate(cardKeyframes(dialog, card), box);
  dialog.animate({ opacity: [0, 1] }, { duration: 280, easing: "ease", pseudoElement: "::backdrop" });
  for (const child of dialog.children) {
    child.animate({ opacity: [0, 1] }, { duration: 260, delay: DIALOG_OPEN_MS * 0.55, easing: "ease", fill: "backwards" });
  }
}

function closeDialog(dialog, card) {
  if (!dialog.open || dialog.dataset.closing !== undefined) return;
  if (!card || prefersStill.matches) return dialog.close();

  dialog.dataset.closing = "";
  const fill = "forwards";
  for (const child of dialog.children) child.animate({ opacity: [1, 0] }, { duration: 140, easing: "ease-in", fill });
  dialog.animate({ opacity: [1, 0] }, { duration: DIALOG_CLOSE_MS, easing: "ease-in", pseudoElement: "::backdrop", fill });
  const shrink = dialog.animate(cardKeyframes(dialog, card).reverse(), {
    duration: DIALOG_CLOSE_MS,
    delay: 60,
    easing: "cubic-bezier(0.5, 0, 0.6, 1)",
    fill,
  });
  const done = () => {
    delete dialog.dataset.closing;
    dialog.close();
  };
  shrink.finished.then(done, done);
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
