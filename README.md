# LocBike

Landing page for LocBikePocos, a cycle-tourism agency and bike rental in Poços de Caldas – MG. Plain HTML + CSS + JS with no build step, hosted on GitHub Pages.

## Structure

```
index.html            # single page, one <section> per block
404.html              # GitHub Pages not-found page
assets/css/styles.css # tokens, reset, layout, components, sections
assets/js/main.js     # WhatsApp links, mobile nav, footer year
assets/js/motion.js   # scroll-driven cyclists, reveals, link/click effects (decorative)
assets/img/           # images, favicon
.nojekyll             # serve files as-is (skip Jekyll processing)
```

Pages in `index.html` (each `<section>` is one full-screen page):

| Page | id | Contents |
|---|---|---|
| Hero | `#inicio` | Headline, CTAs, trust strip |
| Bike Tour | `#bike-tour` | The full tour (up to 5h), what's included |
| Roteiros urbanos | `#roteiros` | Cards: `#urbanos-pocos`, `#urbano-noturno` |
| Roteiros MTB | `#roteiros-mtb` | `#mtb-pocos` |
| Grandes roteiros | `#grandes-roteiros` | Cards: `#caminho-da-fe` (with date list), `#serra-da-canastra`, `#rota-do-vulcao` |
| Passeios 4x4 | `#passeios-4x4` | Cards: `#fazenda-cafe-azeite`, `#pico-do-gaviao` |
| Locação avulsa | `#locacao` | Cards: `#bikes-urbanas`, `#e-bikes`, `#bike-infantil`, `#acessorios` |
| Vale-presente | `#vale-presente` | |
| Quem somos | `#quem-somos` | Story, mission/vision/values |
| FAQ, Contato | `#faq`, `#contato` | |

The header menu has dropdowns (desktop, ≥1100px) linking straight to each card. Text in `[brackets]` is placeholder content still to be written.

## Motion

`assets/js/motion.js` plus the "Motion" block at the end of `styles.css`:

- **Full-screen pages**: every `main > section` fills the screen below the header, and scrolling snaps page by page (`scroll-snap-type` on `html`). On phones, a section taller than the screen scrolls through its own content before the next page snaps in.
- **Road strip** under the header: there's a stop for each page, and the cyclist rides from stop to stop as pages change. It turns around when you scroll up, and pops a wheelie while a nav link scrolls the page.
- **Hero landscape**: mountains/road loop sideways behind a pedalling cyclist; scrolling makes them ride faster. Layer speed is `data-layer`, tile width is `data-tile` (must match the CSS `--tile`).
- **Reveal**: content fades up as each page arrives. The selector list lives in both `motion.js` (`REVEAL_SELECTOR`) and the CSS. Keep them in sync.
- **Click effects**: button ripple, heading "swoosh" when you land on a section, active nav link while scrolling.
- Everything is disabled for visitors with *reduce motion* turned on.

Keep all paths relative (`assets/...`, not `/assets/...`). GitHub Pages serves project sites from `/<repo-name>/`, so absolute paths break.

## Configuration

- **WhatsApp:** `WHATSAPP_NUMBER` (currently (35) 9 9779-0123) and the default `WHATSAPP_MESSAGE` are at the top of `assets/js/main.js`. They apply to every element with `data-whatsapp`. A link can set its own prefilled message with `data-whatsapp="..."`, as the gift-voucher button does. The `href` in the HTML is a plain `wa.me` fallback for when JS is off.
- **Contacts:** WhatsApp and Instagram (`@locbikepocos`) only. There's no email on purpose.
- **Map:** the Contato page embeds Google Maps (no API key) for Av. Francisco Sales, 969.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

1. Push to `main`.
2. In the repo, open **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.
