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
assets/img/passeios/  # web-ready tour photos/clips (generated from assets/passeios/)
assets/img/deco/      # decorative background SVGs: topo map, placeholder scene, clouds, step chainring
assets/passeios/      # owner's raw photos/videos + info.txt per itinerary (source material, not served)
.nojekyll             # serve files as-is (skip Jekyll processing)
```

Pages in `index.html` (each `<section>` is one full-screen page):

| Page | id | Contents |
|---|---|---|
| Hero | `#inicio` | Headline, CTAs, trust strip |
| Bike Tour | `#bike-tour` | The full tour (up to 5h), what's included |
| Roteiros urbanos | `#roteiros` | Cards: `#urbanos-pocos`, `#noturno-pocos` |
| Roteiros MTB | `#roteiros-mtb` | `#mtb-pocos` |
| MTB pela região | `#mtb-regiao` | E-Bike cards: `#fazenda-cafe-azeite`, `#pico-do-gaviao`, `#vinicola`, `#santa-clara`, `#serra-da-mantiqueira` |
| Grandes roteiros | `#grandes-roteiros` | Cards: `#caminho-da-fe` (with date list), `#serra-da-canastra`, `#rota-do-vulcao` |
| Locação avulsa | `#locacao` | Cards: `#bikes-urbanas`, `#e-bikes`, `#bike-infantil`, `#acessorios` |
| Passeios 4x4 | `#passeios-4x4` | The MTB pela região itineraries by 4x4 vehicle, same photos: `#fazenda-cafe-azeite-4x4`, … (ids end in `-4x4`) |
| Quem somos | `#quem-somos` | Story, mission/vision/values |
| Vale-presente | `#vale-presente` | |
| FAQ, Contato | `#faq`, `#contato` | |

The header menu is Roteiros Bike, Locação avulsa, Passeios 4x4, Quem somos, Vale-presente, plus the Reservar button (goes to Contato). Pages follow that order. The menus have dropdowns (desktop, ≥1100px) linking straight to each card; the MTB pela região tours are indented under MTB Poços (`subnav__sub`). Text in `[brackets]` is placeholder content still to be written.

### Tours (cards + "Ver detalhes" dialogs)

Each tour card in MTB pela região, Grandes roteiros and Passeios 4x4 has a "Ver detalhes" button (`data-dialog-open`) that opens the `<dialog>` right after it: a photo strip (plus a short clip where there is one), the full description, facts, incluso/não incluso, prices and a WhatsApp button with a prefilled message. The text was copied by hand from `assets/passeios/<folder>/info.txt` into `index.html`. Editing an info.txt does not change the site, so update the matching card and dialog in `index.html` too. The info.txt files describe the E-Bike versions. The 4x4 cards reuse the same photos with their own vehicle descriptions; their duration, age, inclusions and prices are `[placeholders]` until the owner sends them. Clicking anywhere on a card with a dialog opens it.

The raw photos/videos in `assets/passeios/` are far too big to serve (2–13 MB photos, up to 85 MB clips). The page uses resized, metadata-free copies in `assets/img/passeios/<slug>/`:

- `NN-800.webp` / `NN-1600.webp`, used through `srcset`. `01` is the card cover.
- `video.mp4`: a 10 s clip at 640px (H.264, made with macOS `avconvert -p Preset640x480 --duration 10`). `video-poster.webp` is its first frame.

To add photos to a tour, export new `NN-800.webp`/`NN-1600.webp` files (EXIF rotation applied, metadata stripped), then add an `<li><img …></li>` to that tour's `tour-gallery__track`.

## Look

Organic shapes and bike motifs. Background pictures live in `assets/img/deco/`. Shapes used as CSS masks (hills, wheels, chainring, chain, stat icons) are inlined in `styles.css` as `data:` URIs, because browsers refuse to load mask images from files when the page is opened straight from disk.

- **Page edges**: each page ends in rolling hills with a dashed tyre track, coloured like the page below. The colour is picked with `:has()` in the "Organic pages" block of `styles.css`. The hills sit inside the page's bottom padding, so page heights and snap points don't change.
- **Backgrounds**: cream pages carry a faint topographic map, and white pages have a giant spoked wheel peeking in from the side.
- **Shapes**: cards have leaf-shaped corners and photos with a hill-shaped bottom edge. Split images are breathing blobs with a yellow shadow, and buttons and FAQ items are pills.
- **Bike details**: a chainring on primary buttons, numbered steps on chainrings joined by a chain, a wheel before each kicker, and icons on the tour stats (`data-icon="distance|elevation|time|level"`). There's a chain line in the footer and a checkered finish flag on the last road stop.
- **Placeholders**: `.placeholder-media` shows an illustrated landscape until a photo replaces it.

## Motion

`assets/js/motion.js` plus the "Motion" block at the end of `styles.css`:

- **Full-screen pages**: every `main > section` fills the screen below the header, and scrolling snaps page by page (`scroll-snap-type` on `html`). On phones, a section taller than the screen scrolls through its own content before the next page snaps in.
- **Road strip** under the header: there's a stop for each page, and the cyclist rides from stop to stop as pages change. It turns around when you scroll up, and pops a wheelie while a nav link scrolls the page.
- **Hero landscape**: mountains/road loop sideways behind a pedalling cyclist; scrolling makes them ride faster. Layer speed is `data-layer`, tile width is `data-tile` (must match the CSS `--tile`).
- **Reveal**: content fades up as each page arrives. The selector list lives in both `motion.js` (`REVEAL_SELECTOR`) and the CSS. Keep them in sync.
- **Click effects**: button ripple, heading "swoosh" when you land on a section, active nav link while scrolling.
- **Bike bits**: the big wheels and kicker wheels roll as you scroll (CSS scroll-driven animations; they stay still in browsers without them). Cards lean when hovered, the chainring on buttons turns on hover, split images slowly change shape, and clouds drift across the hero.
- Everything is disabled for visitors with *reduce motion* turned on.

Keep all paths relative (`assets/...`, not `/assets/...`). GitHub Pages serves project sites from `/<repo-name>/`, so absolute paths break.

## Configuration

- **WhatsApp:** `WHATSAPP_NUMBER` (currently (35) 9 9779-0123) and the default `WHATSAPP_MESSAGE` are at the top of `assets/js/main.js`. They apply to every element with `data-whatsapp`. Every booking button sets its own prefilled message with `data-whatsapp="..."`, naming the tour or rental it books, so a new card's button needs one too. The `href` in the HTML is a plain `wa.me` fallback for when JS is off.
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
