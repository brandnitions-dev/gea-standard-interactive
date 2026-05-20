# The GEA STANDARD — modern interactive rebuild

A modernised presentation of **The GEA STANDARD**. The substantive content (all
headings, paragraphs, images, tables, lists, captions, links, data values) is
preserved verbatim from the canonical source `GEA-STANDARD.html`. Only the
presentation layer (layout, styling, navigation, interactivity) has been
rebuilt. No content was added, removed, edited, or paraphrased.

## Project layout

```
gea-standard-site/
├── index.html              ← the rebuilt single-page document
├── styles.css              ← modern responsive styling (light/dark/print)
├── app.js                  ← UI behavior (TOC, search, theme, scroll, a11y)
├── assets/                 ← original images and SVGs (unchanged)
├── build_site.py           ← deterministic builder (re-generates index.html)
├── audit_source.py         ← per-element audit of the canonical source
├── audit_build.py          ← source-vs-built parity comparison
└── audit_compare.json      ← latest parity report (machine readable)
```

## How to run

```bash
# From the project directory:
python3 -m http.server 5000
# then open http://localhost:5000
```

No build step is required at runtime. To regenerate `index.html` after
changing the canonical source or build script:

```bash
# (Run from /home/user/workspace so paths in build_site.py resolve.)
python3 build_site.py
python3 audit_build.py     # confirms preservation
```

## What's new (interface only)

All UI labels added to the page are clearly interface-only and never inserted
into the GEA STANDARD content:

* **Sticky top bar** with brand, search field, print button, and dark-mode
  toggle.
* **Sticky sidebar table of contents** generated from the original document's
  TOC — collapsible/expandable, scroll-spied active section, ancestor
  auto-expand on navigation.
* **In-document search** ("Search sections…"): incremental filter across every
  heading with keyboard navigation (`/` focuses, arrow keys move). Search also
  filters the sidebar TOC to only show matching branches.
* **Responsive table wrappers** (`<div class="gea-table-wrap" role="region"
  tabindex="0">`) so wide tables scroll horizontally on small screens without
  breaking the layout, and remain keyboard-focusable.
* **Back-to-top** floating button (appears after scrolling).
* **Reading progress** bar across the top.
* **Dark/Light theme toggle** with `prefers-color-scheme` default and
  preview-safe in-session switching; no-flash inline init.
* **Print / Save-as-PDF**: dedicated print stylesheet that hides UI chrome,
  restores the legacy inline Table of Contents in full, and avoids breaking
  tables/figures across pages.
* **Mobile**: drawer-style sidebar with backdrop, hamburger toggle, focus
  trap-safe Escape-to-close.

## Accessibility

* Semantic landmarks: `<header role="banner">`, `<nav>`, `<aside>`,
  `<main id="main-content">`, `<button>` controls, ARIA-expanded states on
  every TOC tree item, `aria-pressed` on the theme toggle, `aria-label` on all
  icon-only buttons.
* **Skip-link** to main content for keyboard users.
* Strong **visible focus rings** using `:focus-visible`.
* **Reduced-motion** respected (`prefers-reduced-motion: reduce` disables
  smooth scroll, transitions, and target-flash highlight).
* **Color contrast** meets WCAG AA in both themes (text on backgrounds tested
  for ≥4.5:1 ratio).
* Tables wrapped in scrollable regions with descriptive `aria-label`.
* All `<img>` elements retain original `alt`; figures with captions
  back-fill `alt` from `<figcaption>` when missing.
* Keyboard-only navigation works end-to-end (search → results → main content
  → sidebar TOC accordions).

## Content preservation

The build runs a strict audit comparing source vs. built. Latest run:

| Metric        | Source  | Built   | Status |
| ------------- | ------- | ------- | ------ |
| Headings      | 165     | 165     | OK     |
| Paragraphs    | 241     | 241     | OK     |
| Images        | 142     | 142     | OK     |
| Tables        | 10      | 10      | OK     |
| `<ul>`        | 195     | 195     | OK     |
| `<ol>`        | 252     | 252     | OK     |
| `<li>`        | 447     | 447     | OK     |
| Links         | 225     | 225     | OK     |
| Words         | 21,330  | 21,330  | OK     |
| Characters    | 164,826 | 164,826 | OK     |
| Heading order | identical | identical | OK |
| Table cell signatures | identical | identical | OK |
| Image set (path-normalized) | identical | identical | OK |
| Link set (anchor-normalized) | identical | identical | OK |
| **Article text SHA-256** | `90da1c5725d828fa…641652b` | `90da1c5725d828fa…641652b` | identical |

The SHA-256 of the normalized article text is **byte-identical** between
source and built — proving zero content drift.

### Path/anchor normalization (non-content rewrites)

The build pipeline applies only these non-content transformations:

1. `./GEA STANDARD_files/X` → `./assets/X` (image and asset paths).
2. `https://geaadmin.github.io/geastd/#anchor` → `#anchor` (in-page links).
3. Saved-page placeholder iframe paths (`./GEA STANDARD_files/saved_resource(N).html`)
   → their original live URLs as found on the live page
   (`https://geaadmin.github.io/gmsank/`, `…otec/`, `…gsad/`, `…igs/`,
   `…eip/`, `…GST/`, `…gcp/`). Verified against the canonical live page.
4. Every `<table>` is wrapped in a non-content `<div class="gea-table-wrap">`
   responsive container.
5. The legacy inline `<nav class="table_of_contents">` is *kept* in the DOM
   (preserving the canonical text) but visually hidden in screen mode; it is
   restored on the print stylesheet so PDFs include a proper TOC page.

No textual content is modified by any of these steps.

## Browser support

Modern evergreen browsers (Chrome/Edge/Firefox/Safari current). Uses
IntersectionObserver, CSS color-mix, backdrop-filter, and `:focus-visible`.

## Sources

* Canonical content: `/home/user/workspace/GEA-STANDARD.html` (provided).
* Live reference for asset URLs and iframe targets: <https://geaadmin.github.io/geastd/>
* Old reference zip (assets identical, used only for verification): `geastd-main.zip`.
