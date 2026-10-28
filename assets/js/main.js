// Locbike — main script

// Single place to set the WhatsApp contact. Digits only: country + area code + number.
const WHATSAPP_NUMBER = "55XXXXXXXXXXX";
const WHATSAPP_MESSAGE = "Olá! Gostaria de alugar uma bike.";

// Point every [data-whatsapp] link at the configured number + prefilled message
function initWhatsAppLinks() {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    link.href = url;
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
    link.addEventListener("click", () => setOpen(false));
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
