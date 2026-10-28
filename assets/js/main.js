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

function initFooterYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

initWhatsAppLinks();
initNav();
initFooterYear();
