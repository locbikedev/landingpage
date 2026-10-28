# Locbike

Landing page for Locbike, a bike rental business. Plain HTML + CSS + JS with no build step, hosted on GitHub Pages.

## Structure

```
index.html            # single page, one <section> per block
404.html              # GitHub Pages not-found page
assets/css/styles.css # tokens, reset, layout, components, sections
assets/js/main.js     # WhatsApp links, mobile nav, footer year
assets/img/           # images, favicon
.nojekyll             # serve files as-is (skip Jekyll processing)
```

Sections in `index.html`: header/nav · hero · trust strip · featured/promo · bikes · how it works · pricing · gift voucher · routes · about · testimonials · FAQ · contact · footer · floating WhatsApp button.

Keep all paths relative (`assets/...`, not `/assets/...`). GitHub Pages serves project sites from `/<repo-name>/`, so absolute paths break.

## Configuration

- **WhatsApp number and message:** `WHATSAPP_NUMBER` and `WHATSAPP_MESSAGE` at the top of `assets/js/main.js`. These apply to every element with `data-whatsapp`.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

1. Push to `main`.
2. In the repo, open **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.
